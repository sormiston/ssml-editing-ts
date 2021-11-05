// INIT
// import vkbeautify from "./node_modules/vkbeautify/index.js";
import {
  correlationEngine,
  getRangeMap,
  getPartition,
  organizeMap,
  checkMapFidelity,
} from "./correlationEngine";

function scrubTags(str: string) {
  str = str.toString();
  return str.replace(/<[^>]*>/g, "");
}

const OPEN_SPEAK_TAG = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
       xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">`;
const CLOSING_SPEAK_TAG = "</speak>";

// REPRESENTS DATA FROM BACKEND, TEXT WITH SOME SSML DONE
const ssml = `No anúncio, Geraldo Rabello convida a família para falar sobre o empreendimento, menos <prosody pitch="low">Luiza, que estava no Canadá.</prosody> A frase logo se popularizou no Twitter e Facebook, tornando-se rapidamente um dos assuntos mais comentados da primeira rede social.`;

const textElt = document.querySelector(
  "#fresh-plain-text"
)! as HTMLParagraphElement;
const outputElt = document.querySelector(
  "#generated-ssml"
)! as HTMLParagraphElement;

textElt.textContent = scrubTags(ssml);

const parser = new DOMParser();
const serializer = new XMLSerializer();

// SSML DOC is primary state object that must sync with user text manipulation
let ssmlDoc = parser.parseFromString(
  OPEN_SPEAK_TAG + ssml + CLOSING_SPEAK_TAG,
  "text/xml"
);

// READOUT shows how SSML doc will serialize
function printXMLString() {
  let ssmlDocOutput = serializer.serializeToString(ssmlDoc);
  // let beautifiedXML = vkbeautify.xml(ssmlDocOutput);
  outputElt.innerText = ssmlDocOutput;
}
printXMLString();
console.dir(ssmlDoc);

// Some important LOCAL MEMORY INITS
let logs = false;
let lastTextSnapshot = textElt.textContent;
let targetPartition;
let targetXMLTextNode;
// Can we successfully map between the de-tagged user text and the XML tree ?

// REGIONAL CLICK TEST
textElt.addEventListener("click", (e) => {
  const selectableTextIdx = getSelectableTextIdx();
  const rangeMap = getRangeMap(lastTextSnapshot, ssmlDoc.firstElementChild);
  const { partitionKey, partitionStart, partitionEnd } = getPartition(
    rangeMap,
    selectableTextIdx
  );
  console.log("partitionKey", partitionKey);
  const textNodeInXMLDoc = rangeMap[partitionKey];
  console.log("textNodeInXMLDoc", textNodeInXMLDoc);
});
textElt.addEventListener("keydown", (e) => {
  console.log(e);
  antecipateMutation();
});
//  *******************************
function antecipateMutation() {
  // get cursor position before key input
  const sel = window.getSelection();
  let { selectableTextIdx } = correlationEngine(textElt.textContent, textElt, {
    tnode: sel.anchorNode,
    idx: sel.anchorOffset,
  });

  selectableTextIdx = selectableTextIdx || textElt.textContent.length - 1;
  // get corresponding tnode in xml tree
  const rangeMap = getRangeMap(textElt.textContent, ssmlDoc.firstElementChild);
  const partition = getPartition(rangeMap, selectableTextIdx);
  // console.log("partitionKey", partitionKey);
  const textNodeInXMLDoc = rangeMap[partition.partitionKey];
  // console.log("textNodeInXMLDoc");
  // console.dir(textNodeInXMLDoc);

  targetPartition = partition;
  targetXMLTextNode = textNodeInXMLDoc;
}
// **************************

// ***************************
function getSelectableTextIdx(charDelt = 0) {
  const sel = window.getSelection();
  const { selectableTextIdx } = correlationEngine(lastTextSnapshot, textElt, {
    tnode: sel.anchorNode,
    idx: sel.anchorOffset + charDelt * -1,
  });
  return selectableTextIdx || lastTextSnapshot.length - 1;
} // ************************

// ****************************
// function getTextNodeInXMLDoc(selectableText, indexInText) {
//   const { correlationMap } = correlationEngine(
//     selectableText,
//     ssmlDoc.firstElementChild
//   );
//   const tagNodeInDoc = correlationMap[indexInText];
//   logs &&
//     console.dirxml({
//       tag: tagNodeInDoc.tnode.parentElement,
//       value: tagNodeInDoc.tnode.textContent,
//       node: tagNodeInDoc.tnode,
//     });
//   checkMapFidelity(selectableText, correlationMap);
//   return tagNodeInDoc.tnode;
// } // ****************************

// ********************************

function checkParity() {
  console.log(
    "parity: " + (textElt.textContent === ssmlDoc.firstElementChild.textContent)
  );
}

// Can we map mutations of text between the de-tagged user text and the XML tree?

function mutationCallback(mutationList, observer) {
  const mutation = mutationList[0];
  if (mutation.type !== "characterData") return;

  const newAggText = mutation.target.parentElement.innerText;
  const charDelt = newAggText.length - lastTextSnapshot.length;
  const newTextNodeValue = newAggText.substring(
    targetPartition.partitionStart,
    targetPartition.partitionEnd + charDelt + 1
  );
  targetXMLTextNode.textContent = newTextNodeValue;
  lastTextSnapshot = newAggText;

  printXMLString();
  checkParity();
}
const observer = new MutationObserver(mutationCallback);
observer.observe(textElt, {
  subtree: true,
  characterData: true,
});

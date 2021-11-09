import {
  correlationEngine,
  getRangeMap,
  getPartition,
  organizeMap,
  checkMapFidelity,
} from "./correlationEngine.js";

function scrubTags(str: string) {
  str = str.toString();
  return str.replace(/<[^>]*>/g, "");
}

const OPEN_SPEAK_TAG = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
       xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">`;
const CLOSING_SPEAK_TAG = "</speak>";

// REPRESENTS DATA FROM BACKEND, TEXT WITH SOME SSML DONE
const ssml = `No anúncio, Geraldo Rabello convida a família para falar sobre o empreendimento, menos <prosody pitch="low">Luiza, que estava no Canadá.</prosody> A frase logo se popularizou no <break strength="string" />Twitter e <phoneme alphabet="string">F</phoneme>a`;

// cebook, tornando-se rapidamente um dos assuntos mais comentados da primeira rede social.

// const ssml = `No anúncio, Geraldo Rabello convida a família para falar sobre o empreendimento, menos <prosody pitch="low">Luiza, que estava no Canadá.</prosody> A frase logo se popularizou no Twitter e Facebook, tornando-se rapidamente um dos assuntos mais comentados da primeira rede social.`;

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
let ssmlDoc: Document = parser.parseFromString(
  OPEN_SPEAK_TAG + ssml + CLOSING_SPEAK_TAG,
  "text/xml"
);

// READOUT shows how SSML doc will serialize
function printXMLString() {
  const ssmlDocOutput = serializer.serializeToString(ssmlDoc);
  const node = (document as Document).createTextNode(ssmlDocOutput);
  if (outputElt.firstChild) {
    outputElt.firstChild.remove();
  }
  outputElt.append(node);
  // let outputText = outputElt.firstChild as Text
  // outputText.data = ssmlDocOutput;
}
printXMLString();
console.dir(ssmlDoc);

// Some important LOCAL MEMORY INITS
let logs = false;
let lastTextSnapshot = textElt.innerText;
let targetPartition: Partition;
let targetXMLTextNode: Text;

// Can we successfully map between the de-tagged user text and the XML tree ?

// REGIONAL CLICK TEST
// textElt.addEventListener("click", (e) => {
//   const selectableTextIdx = getSelectableTextIdx();
//   if (!selectableTextIdx) return;
//   const rangeMap = getRangeMap(
//     lastTextSnapshot,
//     ssmlDoc.firstElementChild! as Element
//   );
//   const { partitionKey, partitionStart, partitionEnd } = getPartition(
//     rangeMap,
//     selectableTextIdx
//   );
//   console.log("partitionKey", partitionKey);
//   const textNodeInXMLDoc = rangeMap[partitionKey];
//   console.log("textNodeInXMLDoc", textNodeInXMLDoc);
// });
textElt.addEventListener("keydown", (e) => {
  console.log(e);
  (<any>window).mostRecentKey = e.code;
  const antecipation = antecipateMutation(e.code);
  if (antecipation) {
    [targetPartition, targetXMLTextNode] = antecipation;
  }
});
//  Func antecipateMutation : KEYDOWN EVENT HANDLER
//  grabs the "oldCharData" we are interested in by
function antecipateMutation(
  lastKeyPress: string
): [Partition, Text] | undefined {
  // get cursor position before key input
  const sel = window.getSelection();
  if (!sel?.anchorNode) return undefined;
  let { selectableTextIdx } = correlationEngine(
    textElt.innerText || "",
    textElt,
    {
      tnode: sel.anchorNode as Text,
      idx: sel.anchorOffset,
    }
  );

  try {
    if (textElt.textContent === null) {
      throw new Error("No text content");
    }
    selectableTextIdx = selectableTextIdx || textElt.innerText.length;
    // get corresponding tnode in xml tree
    const rangeMap = getRangeMap(
      textElt.innerText,
      ssmlDoc.firstElementChild! as Element
    );
    const partition = getPartition(rangeMap, selectableTextIdx);
    const textNodeInXMLDoc = rangeMap[partition.partitionKey];
    return [partition, textNodeInXMLDoc];
  } catch (error) {
    console.error(error);
    return undefined;
  }
}
// **************************

// ***************************
function getSelectableTextIdx(charDelt = 0) {
  const sel = window.getSelection();
  if (!sel?.anchorNode) return;
  const { selectableTextIdx } = correlationEngine(lastTextSnapshot, textElt, {
    tnode: sel.anchorNode as Text,
    idx: sel.anchorOffset + charDelt * -1,
  });
  return selectableTextIdx || lastTextSnapshot.length;
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
  // normalize whitespaces
  const whitespaceNormalizer = (char: string) => {
    if (char.charCodeAt(0) === 160) {
      return String.fromCharCode(32);
    } else {
      return char;
    }
  };
  const normalizedText = textElt.innerText
    .split("")
    .map(whitespaceNormalizer)
    .join("");
  const normalizedSSMLText = ssmlDoc.firstElementChild?.textContent
    ?.split("")
    .map(whitespaceNormalizer)
    .join("");

  console.log("parity: " + (normalizedText === normalizedSSMLText));
}

// Can we map mutations of text between the de-tagged user text and the XML tree?

function mutationCallback(mutationList: Array<MutationRecord>) {
  try {
    const mutation = mutationList[0];
    if (!mutation) throw new Error("undefined mutation");
    const newAggText = textElt.innerText;
    if (!newAggText) throw new Error("unable to find mutating text");

    const charDelt = newAggText!.length - lastTextSnapshot.length;
    let newTextNodeValue;
    if (targetPartition.isFinal) {
      newTextNodeValue = newAggText!.substring(targetPartition.partitionStart);
    } else {
      newTextNodeValue = newAggText!.substring(
        targetPartition.partitionStart,
        targetPartition.partitionEnd + charDelt + 1
      );
    }

    console.log("targetXMLTextNode ", targetXMLTextNode);
    if (newTextNodeValue.length === 0) {
      let target =
        targetXMLTextNode.parentElement!.tagName === "speak"
          ? targetXMLTextNode
          : targetXMLTextNode.parentElement!;

      target.remove();
      ssmlDoc.firstElementChild?.normalize();
    } else {
      targetXMLTextNode.textContent = newTextNodeValue;
      console.log(
        "text content length in node: " + targetXMLTextNode.textContent.length
      );
    }

    lastTextSnapshot = newAggText;

    printXMLString();
    checkParity();
  } catch (error) {
    console.error(error);
  }
}
const observer = new MutationObserver(mutationCallback);
observer.observe(textElt, {
  subtree: true,
  characterData: true,
});

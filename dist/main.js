"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const correlationEngine_1 = require("./correlationEngine");
function scrubTags(str) {
    str = str.toString();
    return str.replace(/<[^>]*>/g, "");
}
const OPEN_SPEAK_TAG = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
       xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">`;
const CLOSING_SPEAK_TAG = "</speak>";
const ssml = `No anúncio, Geraldo Rabello convida a família para falar sobre o empreendimento, menos <prosody pitch="low">Luiza, que estava no Canadá.</prosody> A frase logo se popularizou no Twitter e Facebook, tornando-se rapidamente um dos assuntos mais comentados da primeira rede social.`;
const textElt = document.querySelector("#fresh-plain-text");
const outputElt = document.querySelector("#generated-ssml");
textElt.textContent = scrubTags(ssml);
const parser = new DOMParser();
const serializer = new XMLSerializer();
let ssmlDoc = parser.parseFromString(OPEN_SPEAK_TAG + ssml + CLOSING_SPEAK_TAG, "text/xml");
function printXMLString() {
    let ssmlDocOutput = serializer.serializeToString(ssmlDoc);
    outputElt.innerText = ssmlDocOutput;
}
printXMLString();
console.dir(ssmlDoc);
let logs = false;
let lastTextSnapshot = textElt.textContent;
let targetPartition;
let targetXMLTextNode;
textElt.addEventListener("click", (e) => {
    const selectableTextIdx = getSelectableTextIdx();
    const rangeMap = (0, correlationEngine_1.getRangeMap)(lastTextSnapshot, ssmlDoc.firstElementChild);
    const { partitionKey, partitionStart, partitionEnd } = (0, correlationEngine_1.getPartition)(rangeMap, selectableTextIdx);
    console.log("partitionKey", partitionKey);
    const textNodeInXMLDoc = rangeMap[partitionKey];
    console.log("textNodeInXMLDoc", textNodeInXMLDoc);
});
textElt.addEventListener("keydown", (e) => {
    console.log(e);
    antecipateMutation();
});
function antecipateMutation() {
    const sel = window.getSelection();
    let { selectableTextIdx } = (0, correlationEngine_1.correlationEngine)(textElt.textContent, textElt, {
        tnode: sel.anchorNode,
        idx: sel.anchorOffset,
    });
    selectableTextIdx = selectableTextIdx || textElt.textContent.length - 1;
    const rangeMap = (0, correlationEngine_1.getRangeMap)(textElt.textContent, ssmlDoc.firstElementChild);
    const partition = (0, correlationEngine_1.getPartition)(rangeMap, selectableTextIdx);
    const textNodeInXMLDoc = rangeMap[partition.partitionKey];
    targetPartition = partition;
    targetXMLTextNode = textNodeInXMLDoc;
}
function getSelectableTextIdx(charDelt = 0) {
    const sel = window.getSelection();
    const { selectableTextIdx } = (0, correlationEngine_1.correlationEngine)(lastTextSnapshot, textElt, {
        tnode: sel.anchorNode,
        idx: sel.anchorOffset + charDelt * -1,
    });
    return selectableTextIdx || lastTextSnapshot.length - 1;
}
function checkParity() {
    console.log("parity: " + (textElt.textContent === ssmlDoc.firstElementChild.textContent));
}
function mutationCallback(mutationList, observer) {
    const mutation = mutationList[0];
    if (mutation.type !== "characterData")
        return;
    const newAggText = mutation.target.parentElement.innerText;
    const charDelt = newAggText.length - lastTextSnapshot.length;
    const newTextNodeValue = newAggText.substring(targetPartition.partitionStart, targetPartition.partitionEnd + charDelt + 1);
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
//# sourceMappingURL=main.js.map
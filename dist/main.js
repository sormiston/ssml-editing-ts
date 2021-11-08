import { correlationEngine, getRangeMap, getPartition, } from "./correlationEngine.js";
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
    if (!selectableTextIdx)
        return;
    const rangeMap = getRangeMap(lastTextSnapshot, ssmlDoc.firstElementChild);
    const { partitionKey, partitionStart, partitionEnd } = getPartition(rangeMap, selectableTextIdx);
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
    if (!(sel === null || sel === void 0 ? void 0 : sel.anchorNode))
        return;
    let { selectableTextIdx } = correlationEngine(textElt.textContent || "", textElt, {
        tnode: sel.anchorNode,
        idx: sel.anchorOffset,
    });
    try {
        if (textElt.textContent === null) {
            throw new Error("No text content");
        }
        selectableTextIdx = selectableTextIdx || textElt.textContent.length - 1;
        const rangeMap = getRangeMap(textElt.textContent, ssmlDoc.firstElementChild);
        const partition = getPartition(rangeMap, selectableTextIdx);
        const textNodeInXMLDoc = rangeMap[partition.partitionKey];
        targetPartition = partition;
        targetXMLTextNode = textNodeInXMLDoc;
    }
    catch (error) {
        console.error(error);
    }
}
function getSelectableTextIdx(charDelt = 0) {
    const sel = window.getSelection();
    if (!(sel === null || sel === void 0 ? void 0 : sel.anchorNode))
        return;
    const { selectableTextIdx } = correlationEngine(lastTextSnapshot, textElt, {
        tnode: sel.anchorNode,
        idx: sel.anchorOffset + charDelt * -1,
    });
    return selectableTextIdx || lastTextSnapshot.length - 1;
}
function checkParity() {
    var _a;
    console.log("parity: " + (textElt.textContent === ((_a = ssmlDoc.firstElementChild) === null || _a === void 0 ? void 0 : _a.textContent)));
}
function mutationCallback(mutationList) {
    var _a, _b;
    try {
        const mutation = mutationList[0];
        if (!mutation)
            throw new Error("undefined mutation");
        const newAggText = (_b = (_a = mutation === null || mutation === void 0 ? void 0 : mutation.target) === null || _a === void 0 ? void 0 : _a.parentElement) === null || _b === void 0 ? void 0 : _b.innerText;
        if (!newAggText)
            throw new Error("unable to find mutating text");
        const charDelt = newAggText.length - lastTextSnapshot.length;
        const newTextNodeValue = newAggText.substring(targetPartition.partitionStart, targetPartition.partitionEnd + charDelt + 1);
        targetXMLTextNode.textContent = newTextNodeValue;
        lastTextSnapshot = newAggText;
        printXMLString();
        checkParity();
    }
    catch (error) {
        console.error(error);
    }
}
const observer = new MutationObserver(mutationCallback);
observer.observe(textElt, {
    subtree: true,
    characterData: true,
});
//# sourceMappingURL=main.js.map
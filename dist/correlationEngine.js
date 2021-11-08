function walkAndCollectRenderedTextNodes(subtree) {
    const srcList = Array.from(subtree.childNodes);
    let result = [];
    srcList.forEach((srcNode) => {
        if (srcNode instanceof Text && /\S/.test(srcNode.textContent || "")) {
            result = result.concat(srcNode);
            return;
        }
        if (!srcNode.hasChildNodes())
            return;
        else
            result = result.concat(walkAndCollectRenderedTextNodes(srcNode));
    });
    return result;
}
export function correlationEngine(referenceText, tree, editPoint = null) {
    const targetTNodes = walkAndCollectRenderedTextNodes(tree);
    const returnData = {
        correlationMap: [],
        selectableTextIdx: null,
    };
    let fromIdx = 0;
    const chars = referenceText.split("");
    if (chars.length === 0)
        return returnData;
    try {
        for (let [i, c] of chars.entries()) {
            while (targetTNodes.length) {
                let currTNode = targetTNodes[0];
                if (currTNode.textContent === null)
                    throw new Error("empty textNode in correlation engine");
                let localIdx = currTNode.textContent.indexOf(c, fromIdx);
                if (localIdx >= 0) {
                    fromIdx = localIdx + 1;
                    if (editPoint &&
                        editPoint.tnode === currTNode &&
                        editPoint.idx === localIdx) {
                        returnData.selectableTextIdx = i;
                    }
                    returnData.correlationMap.push({
                        tnode: currTNode,
                        idx: localIdx,
                        c,
                        masterIdx: i,
                    });
                    break;
                }
                else {
                    if (/\s/.test(c) &&
                        fromIdx >= currTNode.textContent.length &&
                        targetTNodes[1].textContent &&
                        !targetTNodes[1].textContent
                            .replace(/[\s\n\r\t]+/, " ")
                            .startsWith(c)) {
                        returnData.correlationMap.push({
                            tnode: currTNode,
                            idx: localIdx,
                            c: "phantom space",
                            masterIdx: i,
                        });
                        break;
                    }
                    targetTNodes.shift();
                    fromIdx = 0;
                }
            }
            continue;
        }
    }
    catch (error) {
        console.error(error);
    }
    return returnData;
}
export function organizeMap(correlationMap) {
    try {
        if (!correlationMap[0]) {
            throw new Error("tried to organize an empty CorrelationMap");
        }
    }
    catch (error) {
        console.error(error);
    }
    let result = {};
    let currentVolume = [correlationMap[0]];
    let start = 0;
    function finishVolume(entry, i, isLast = false) {
        const rangeKey = isLast ? `${start}-${i}` : `${start}-${i - 1}`;
        if (isLast) {
            currentVolume.push(entry);
        }
        result[rangeKey] = currentVolume;
        if (!isLast) {
            currentVolume = [entry];
            start = i;
        }
    }
    correlationMap.forEach((entry, i, arr) => {
        if (i === 0)
            return;
        if (entry === arr[arr.length - 1]) {
            finishVolume(entry, i, true);
        }
        else if (entry.tnode === currentVolume[currentVolume.length - 1].tnode) {
            currentVolume.push(entry);
        }
        else {
            finishVolume(entry, i);
        }
    });
    return result;
}
export function getRangeMap(selectableText, tree) {
    const { correlationMap } = correlationEngine(selectableText, tree);
    try {
        if (!correlationMap[0]) {
            throw new Error("tried to getRangeMap from an empty CorrelationMap");
        }
    }
    catch (error) {
        console.error(error);
    }
    checkMapFidelity(selectableText, correlationMap);
    const organized = organizeMap(correlationMap);
    const result = {};
    Object.entries(organized).forEach(([k, v]) => {
        result[k] = v[0].tnode;
    });
    return result;
}
export function getPartition(rangeMap, selectableTextIdx) {
    const regex = /(?<start>\d*)-(?<end>\d*)/;
    let result = {};
    Object.keys(rangeMap).forEach((k) => {
        const { start, end } = k.match(regex).groups;
        const [startInt, endInt] = [parseInt(start), parseInt(end)];
        if (selectableTextIdx >= startInt && selectableTextIdx <= endInt) {
            result.partitionKey = k;
            result.partitionStart = parseInt(start);
            result.partitionEnd = parseInt(end);
        }
    });
    if (result.hasOwnProperty("partitionKey")) {
        return result;
    }
    else {
        throw new Error("partition not found");
    }
}
export function checkMapFidelity(reference, map) {
    const chars = reference.split("");
    try {
        chars.forEach((c, i) => {
            if (map[i].c !== c) {
                throw new Error(`mapping error at index ${i}, char ${c}, in context ${reference.substring(i - 5, i + 5)}`);
            }
        });
        console.log("map OK");
    }
    catch (error) {
        console.log(error);
    }
}
//# sourceMappingURL=correlationEngine.js.map
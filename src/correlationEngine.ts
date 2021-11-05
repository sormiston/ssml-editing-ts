function walkAndCollectRenderedTextNodes(subtree: HTMLElement | ChildNode) {
  const srcList = Array.from(subtree.childNodes);
  let result: Text[] = [];

  srcList.forEach((srcNode) => {
    console.log(typeof srcNode);
    if (
      srcNode.nodeType === Node.TEXT_NODE &&
      /\S/.test(srcNode.textContent || "")
    ) {
      // if you're here, this is a good entry to map
      result = result.concat(srcNode);
      return;
    }
    if (!srcNode.hasChildNodes()) return;
    else result = result.concat(walkAndCollectRenderedTextNodes(srcNode));
  });

  return result;
}

type EditPoint = {
  tnode: Text;
};
export function correlationEngine(
  referenceText: string,
  tree: HTMLElement,
  editPoint = null
) {
  const targetTNodes = walkAndCollectRenderedTextNodes(tree);
  // targetTNodes will be a FIFO queue through which root.innerText.replaceAll(/(\n)+/g, ' ').split('').map will step through, correlating characters to the text nodes in which they are found.
  const returnData = {
    correlationMap: [],
    selectableTextIdx: null,
  };
  let fromIdx = 0;

  const chars = referenceText.split("");
  try {
    for (let [i, c] of chars.entries()) {
      while (targetTNodes.length) {
        let currTNode = targetTNodes[0]! as Text;
        if (currTNode.textContent === null)
          throw new Error("empty textNode in correlation engine");
        let localIdx = currTNode.textContent.indexOf(c, fromIdx);
        if (localIdx >= 0) {
          fromIdx = localIdx + 1; // next tick's search starts only after point where this char was found
          if (
            editPoint &&
            editPoint.tnode === currTNode &&
            editPoint.idx === localIdx
          ) {
            returnData.selectableTextIdx = i;
          }
          returnData.correlationMap.push({
            tnode: currTNode,
            idx: localIdx,
            c,
            masterIdx: i,
          });
          break;
        } else {
          if (
            /\s/.test(c) &&
            fromIdx >= currTNode.textContent.length &&
            targetTNodes[1] &&
            !targetTNodes[1].textContent
              .replace(/[\s\n\r\t]+/, " ")
              .startsWith(c)
          ) {
            // some whitespace will be produced by the browser rendered innerText, but will not actually exist as data in any descendant text node.  Thus, we'll reach this code block to dequeue the text node, but what we really want is to move on to the next word character.  Such "phantom spaces" should not break the algorithm.  Skip them.
            // console.log('phantom space!', `${c.charCodeAt(0)} at idx ${i}`, currTNode)
            returnData.correlationMap.push({
              tnode: currTNode,
              idx: localIdx,
              note: "phantom space",
            });
            break;
          }
          // must leave an unconditioned case to avoid infinite loop
          targetTNodes.shift();
          fromIdx = 0;
        }
      }
      continue;
    }
  } catch (error) {
    console.error(error);
  }

  return returnData;
}

export function organizeMap(correlationMap) {
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
    if (i === 0) return;
    if (entry === arr[arr.length - 1]) {
      finishVolume(entry, i, true);
    } else if (entry.tnode === currentVolume[currentVolume.length - 1].tnode) {
      currentVolume.push(entry);
    } else {
      finishVolume(entry, i);
    }
  });
  return result;
}

export function getRangeMap(selectableText, tree) {
  const { correlationMap } = correlationEngine(selectableText, tree);
  checkMapFidelity(selectableText, correlationMap);
  const organized = organizeMap(correlationMap);
  Object.entries(organized).forEach(([k, v]) => {
    organized[k] = v[0].tnode;
  });
  return organized;
}

export function getPartition(rangeMap, selectableTextIdx) {
  const regex = /(?<start>\d*)-(?<end>\d*)/;
  let result = {};
  Object.keys(rangeMap).forEach((k) => {
    const { start, end } = k.match(regex).groups;
    if (selectableTextIdx >= start && selectableTextIdx <= end) {
      result.partitionKey = k;
      result.partitionStart = parseInt(start);
      result.partitionEnd = parseInt(end);
    }
  });
  if (result.hasOwnProperty("partitionKey")) {
    return result;
  } else {
    throw new Error("partition not found");
  }
}

export function checkMapFidelity(reference, map) {
  const chars = reference.split("");
  try {
    chars.forEach((c, i) => {
      if (map[i].c !== c) {
        throw new Error(
          `mapping error at index ${i}, char ${c}, in context ${reference.substring(
            i - 5,
            i + 5
          )}`
        );
      }
    });
    console.log("map OK");
  } catch (error) {
    console.log(error);
  }
}

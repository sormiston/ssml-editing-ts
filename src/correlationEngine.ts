function walkAndCollectRenderedTextNodes(subtree: Element | ChildNode) {
  const srcList = Array.from(subtree.childNodes);
  let result: Text[] = [];

  srcList.forEach((srcNode) => {
    if (srcNode instanceof Text && /\S/.test(srcNode.textContent || "")) {
      // if you're here, this is a good entry to map
      result = result.concat(srcNode);
      return;
    }
    if (!srcNode.hasChildNodes()) return;
    else result = result.concat(walkAndCollectRenderedTextNodes(srcNode));
  });

  return result;
}

export function correlationEngine(
  referenceText: string,
  tree: Element,
  editPoint: EditPoint | null = null
) {
  const targetTNodes = walkAndCollectRenderedTextNodes(tree);
  // targetTNodes will be a FIFO queue through which root.innerText.replaceAll(/(\n)+/g, ' ').split('').map will step through, correlating characters to the text nodes in which they are found.
  const returnData: CorrelationEngineData = {
    correlationMap: [],
    selectableTextIdx: null,
  };

  const chars = referenceText.split("").filter((c) => c !== "\n");

  if (chars.length === 0) return returnData;
  let fromIdx = 0;
  try {
    for (let [i, c] of chars.entries()) {
      while (targetTNodes.length) {
        let currTNode = targetTNodes[0] as Text;
        if (currTNode.textContent === null)
          throw new Error("empty textNode in correlation engine");
        // strengthening whitespace correlation
        const targetChars = currTNode.textContent.split("").slice(fromIdx);
        let localIdx = targetChars.findIndex((tc) => {
          return (
            tc === c ||
            ((c.charCodeAt(0) === 32 || c.charCodeAt(0) === 160) &&
              (tc.charCodeAt(0) === 32 || tc.charCodeAt(0) === 160))
          );
        });

        // let localIdx = currTNode.textContent.indexOf(c, fromIdx);

        if (localIdx >= 0) {
          localIdx = localIdx + fromIdx;
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
          // if (
          //   /\s/.test(c) &&
          //   fromIdx >= currTNode.textContent.length &&
          //   targetTNodes[1].textContent &&
          //   !targetTNodes[1].textContent
          //     .replace(/[\s\n\r\t]+/, " ")
          //     .startsWith(c)
          // ) {
          //   // some whitespace will be produced by the browser rendered innerText, but will not actually exist as data in any descendant text node.  Thus, we'll reach this code block to dequeue the text node, but what we really want is to move on to the next word character.  Such "phantom spaces" should not break the algorithm.  Skip them.
          //   // console.log('phantom space!', `${c.charCodeAt(0)} at idx ${i}`, currTNode)
          //   returnData.correlationMap.push({
          //     tnode: currTNode,
          //     idx: localIdx,
          //     c: "phantom space",
          //     masterIdx: i,
          //   });
          //   break;
          // }

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

export function organizeMap(correlationMap: CorrelationMap) {
  try {
    if (!correlationMap[0]) {
      throw new Error("tried to organize an empty CorrelationMap");
    }
  } catch (error) {
    console.error(error);
  }

  let result: OrganizedCorrelationMap = {};
  let currentVolume = [correlationMap[0]];
  let start = 0;

  function finishVolume(entry: CorrelationMapEntry, i: number, isLast = false) {
    const rangeKey = isLast ? `${start}-${i}` : `${start}-${i - 1}`;
    // if (isLast) {
    //   currentVolume.push(entry);
    // }
    // if (isLast) {
    //   currentVolume[0].isLast = true
    // }
    result[rangeKey] = currentVolume;
    if (!isLast) {
      currentVolume = [entry];
      start = i;
    }
  }
  correlationMap.forEach((entry, i, arr) => {
    if (i === 0) return;
    // if (entry === arr[arr.length - 1]) {
    //   finishVolume(entry, i, true);
    // } else if (entry.tnode === currentVolume[currentVolume.length - 1].tnode) {
    //   currentVolume.push(entry);
    // } else {
    //   finishVolume(entry, i);
    // }
    if (entry.tnode === currentVolume[currentVolume.length - 1].tnode) {
      currentVolume.push(entry);
    } else {
      finishVolume(entry, i);
    }
    
    if (entry === arr[arr.length - 1]) {
      finishVolume(entry, i, true);
    } 
  });
  return result;
}

export function getRangeMap(selectableText: string, tree: Element) {
  const { correlationMap } = correlationEngine(selectableText, tree);
  try {
    if (!correlationMap[0]) {
      throw new Error("tried to getRangeMap from an empty CorrelationMap");
    }
  } catch (error) {
    console.error(error);
  }

  checkMapFidelity(selectableText, correlationMap);
  const organized = organizeMap(correlationMap);
  const result: Partial<RangeMap> = {};
  Object.entries(organized).forEach(([k, v]) => {
    result[k] = v[0].tnode;
  });
  return result as RangeMap;
}

export function getPartition(
  rangeMap: RangeMap,
  selectableTextIdx: number
) {
  const regex = /(?<start>\d*)-(?<end>\d*)/;
  
  let lastEnd = 0;
  let lastKey = Object.keys(rangeMap)[0];
  let result: Partial<Partition> = {};
  let changedFromInit = false;

  console.log(rangeMap);
  Object.keys(rangeMap).forEach((k, i, arr) => {
    const { start, end } = k.match(regex)!.groups as { [key: string]: string };
    const [startInt, endInt] = [parseInt(start), parseInt(end)];
    if (endInt > lastEnd) {
      lastKey = k;
    }
    if (i > 0 && selectableTextIdx === startInt) {
      k = arr[i - 1];
      const { start: prevStart, end: prevEnd } = k.match(regex)!.groups as {
        [key: string]: string;
      };
      result.partitionKey = k;
      result.partitionStart = parseInt(prevStart);
      result.partitionEnd = parseInt(prevEnd);
      changedFromInit = true;
    } else if (selectableTextIdx >= startInt && selectableTextIdx <= endInt) {
      result.partitionKey = k;
      result.partitionStart = parseInt(start);
      result.partitionEnd = parseInt(end);
      changedFromInit = true;
    }
  });
  if (changedFromInit) {
    console.log(lastKey)
    return result as Partition;
  } else {
    console.warn(
      "cursor index ahead of final partition, defaulting to final partition" +
        lastKey
    );
    return {
      partitionKey: lastKey,
      partitionStart: parseInt(lastKey.match(regex)!.groups!.start),
      partitionEnd: parseInt(lastKey.match(regex)!.groups!.end),
      isFinal: true,
    } as Partition;
  }
}

export function checkMapFidelity(reference: string, map: CorrelationMap) {
  const chars = reference.split("").filter((c) => !/[\n\r\t]+/.test(c));
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.log("error message: ", error.message);
    }
  }
}

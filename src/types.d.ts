type EditPoint = {
  tnode: Text;
  idx: number;
};
type CorrelationMapEntry = {
  tnode: Text;
  idx: number;
  c: string;
  masterIdx: number;
  note?: string;
};
type CorrelationMap = Array<CorrelationMapEntry>;
type OrganizedCorrelationMap = {
  [index: string]: CorrelationMap;
};
type CorrelationEngineData = {
  correlationMap: CorrelationMap;
  selectableTextIdx: number | null;
};
type RangeMap = {
  [index: string]: Text;
};
type Partition = {
  partitionKey: string;
  partitionStart: number;
  partitionEnd: number;
};

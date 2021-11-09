// export function getBlockParentElt(textNode: Text) {
//   // if (textNode && textNode.nodeType !== 3) return;
//   if (Constants.BLOCK_TAGS.includes(textNode.nodeName.toLowerCase()))
//     return textNode;
//   let parent = textNode.parentNode;
//   if (!parent) return;
//   let i = 0;
//   while (!Constants.BLOCK_TAGS.includes(parent.nodeName.toLowerCase())) {
//     parent = parent.parentNode;
//     i++;
//     // default to break potential infinte loop... if we've gone up 10 levels...let's say it's enough
//     if (i === 10) {
//       console.error("10 cycles of blockParent detection without match.");
//       break;
//     }
//   }
//   return parent;
// }

// export function cleanUp(textNode: Text) {
//   let target = textNode
//   let done = false
//   while (!done) {
//     if (Object.values(TAGS).includes(target.parentElement?.tagName!)) {
//     }
//   }
  
// }

const TAGS = {
  voice: "voice",
  expressAs:"mstts:express-as",
  lang:"lang",
  break: "break",
  silence: "mstts:silence",
  p: "p",
  s: "s",
  phoneme: "phoneme",
  lexicon: "lexicon",
  lexeme: "lexeme",
  grapheme: "grapheme",
  alias: "alias",
  prosody: "prosody",
  sayAs: "say-as",
  audio: "audio",
  backgroundAudio: "mstts:backgroundaudio",
  bookmark: "bookmark",
}
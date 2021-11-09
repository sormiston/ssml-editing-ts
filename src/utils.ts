export function cleanUp(ssml: XMLDocument) {
  const root = ssml.firstElementChild;
  const breakTags = [...root!.querySelectorAll("break")];
  breakTags.forEach((bt) => {
    if (!bt.previousSibling?.textContent || !bt.nextSibling?.textContent) {
      bt.remove();
    }
  });
}

const TAGS = {
  voice: "voice",
  expressAs: "mstts:express-as",
  lang: "lang",
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
};

const SELF_CLOSING_TAGS = {
  break: "break",
  bookmark: "bookmark",
};

import { describe, expect, it } from "vitest";
import { isUnwantedVoice, pickVoice, selectableVoices } from "./voices";

function voice(name: string, voiceURI: string, lang = "en-US", extra: Partial<SpeechSynthesisVoice> = {}): SpeechSynthesisVoice {
  return { name, voiceURI, lang, localService: true, default: false, ...extra } as SpeechSynthesisVoice;
}

/** What an iPhone lists for en-US, in its order: joke voices, the old synthesizer set, and Samantha. */
const iphone = [
  voice("Albert", "com.apple.speech.synthesis.voice.Albert"),
  voice("Bad News", "com.apple.speech.synthesis.voice.BadNews"),
  voice("Eddy (English (US))", "com.apple.eloquence.en-US.Eddy"),
  voice("Flo (English (US))", "com.apple.eloquence.en-US.Flo"),
  voice("Fred", "com.apple.speech.synthesis.voice.Fred"),
  voice("Grandma (English (US))", "com.apple.eloquence.en-US.Grandma"),
  voice("Grandpa (English (US))", "com.apple.eloquence.en-US.Grandpa"),
  voice("Junior", "com.apple.speech.synthesis.voice.Junior"),
  voice("Kathy", "com.apple.speech.synthesis.voice.Kathy"),
  voice("Ralph", "com.apple.speech.synthesis.voice.Ralph"),
  voice("Reed (English (US))", "com.apple.eloquence.en-US.Reed"),
  voice("Rocko (English (US))", "com.apple.eloquence.en-US.Rocko"),
  voice("Samantha", "com.apple.voice.compact.en-US.Samantha", "en-US", { default: true }),
  voice("Sandy (English (US))", "com.apple.eloquence.en-US.Sandy"),
  voice("Shelley (English (US))", "com.apple.eloquence.en-US.Shelley"),
  voice("Daniel", "com.apple.voice.compact.en-GB.Daniel", "en-GB"),
];

describe("the phone's own voice", () => {
  it("picks Samantha on an iPhone, never a joke or synthesizer voice", () => {
    expect(pickVoice(iphone, null)?.name).toBe("Samantha");
  });

  it("offers only natural voices in settings", () => {
    const names = selectableVoices(iphone).map((option) => option.label);
    expect(names[0]).toBe("Samantha (en-US)");
    for (const bad of ["Albert", "Eddy", "Flo", "Fred", "Grandma", "Grandpa", "Junior", "Kathy", "Ralph", "Reed", "Rocko", "Sandy", "Shelley", "Bad News"]) {
      expect(names.some((label) => label.startsWith(bad)), bad).toBe(false);
    }
  });

  it("does not keep a saved synthesizer voice", () => {
    expect(pickVoice(iphone, "com.apple.eloquence.en-US.Grandpa")?.name).toBe("Samantha");
  });

  it("prefers a Siri-quality voice when the phone lists one", () => {
    const withSiri = [...iphone, voice("Nicky", "com.apple.ttsbundle.siri_Nicky_en-US_compact")];
    expect(pickVoice(withSiri, null)?.name).toBe("Nicky");
  });

  it("prefers an enhanced copy when one is installed", () => {
    const withEnhanced = [...iphone, voice("Ava (Enhanced)", "com.apple.voice.enhanced.en-US.Ava")];
    expect(pickVoice(withEnhanced, null)?.name).toBe("Ava (Enhanced)");
  });

  it("leaves the choice to the system when only unwanted voices are listed", () => {
    const only = iphone.filter((item) => isUnwantedVoice(item));
    expect(only.length).toBeGreaterThan(10);
    expect(pickVoice(only, null)).toBeUndefined();
  });
});

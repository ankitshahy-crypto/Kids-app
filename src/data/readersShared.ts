import type { Story } from "./stories";

/**
 * Shared readers for weeks 1 to 4: on each page a grown-up line that tells
 * the story (any words), then a short child line built only from the sounds
 * taught so far, the Nest words met so far, and the child's animal's name.
 *
 * The narrator reads the grown-up line. The child line waits for the child:
 * they slide or tap its words, then tap the speaker to check. A page's small
 * surprise (the pile topples, the wave splashes) plays once the child line is
 * read, so the picture rewards reading instead of giving the words away.
 *
 * Each story has a real little plot (someone wants something, tries, meets a
 * surprise, and it ends), no two share a plot and a setting, and every thing a
 * page names is in its picture. Checked by src/data/stories.test.ts.
 *
 * The cast: the child's animal ({hero}), Sam the duck, Tam the cat (week 1),
 * Pip the pig, Nan the goat and Tim the pup (week 2), Dot the hen (week 3).
 */
export const SHARED_READERS: Story[] = [
  // Week 1: a, m, t, s. Nest words: I, a, the.
  {
    id: "w01-who-sat",
    title: "Who Sat on the Mat?",
    week: 1,
    pages: [
      { text: "A little mat lies in the sunshine. Who will sit on it?", child: "A mat!", setting: "meadow", props: ["mat"], parent: "You read the top line. Your child reads the big words: let them slide under 'mat'." },
      { text: "Sam the duck waddles over and sits down first.", child: "Sam sat.", setting: "meadow", props: ["duck", "mat"] },
      { text: "Then Tam the cat squeezes in, right next to Sam.", child: "Tam sat.", setting: "meadow", props: ["duck", "cat"] },
      { text: "Sam and Tam take up all the room. Where can {hero} sit?", child: "Sam! Tam!", setting: "meadow", props: ["duck", "cat"] },
      { text: "{hero} climbs up on top of them both, very carefully.", child: "I sat!", setting: "meadow", props: ["duck", "cat"], payoff: "topple", parent: "After your child reads 'I sat!', watch what happens." },
      { text: "Bump! Down they tumble, giggling. Then they scoot close, and all three fit.", child: "Tam sat. I sat.", setting: "meadow", props: ["mat", "duck"] },
    ],
    before: "Ask: what do you like to sit on? Would you share it?",
    after: "Ask: why did everyone fall down? How did they all fit in the end?",
  },
  {
    id: "w01-sam-at-the-sea",
    title: "Sam at the Sea",
    week: 1,
    pages: [
      { text: "Sam the duck brings his mat to the sea.", child: "I am Sam.", setting: "beach", props: ["duck", "mat"], parent: "Sam is talking. Your child reads what he says." },
      { text: "He puts it down close to the water and sits.", child: "Sam sat.", setting: "beach", props: ["mat", "duck"] },
      { text: "Whoosh! A big wave rolls in and splashes the mat.", child: "The mat!", setting: "beach", props: ["wave", "mat"], payoff: "splash" },
      { text: "Sam shakes his feathers. Then Tam the cat comes by.", child: "Tam! Tam!", setting: "beach", props: ["duck", "cat"] },
      { text: "Tam sits down with Sam. Whoosh! Here comes another wave, and Tam hates getting wet.", child: "Tam sat.", setting: "beach", props: ["cat", "wave"], payoff: "splash" },
      { text: "Tam runs off, but Sam laughs and paddles into the waves. Ducks love water!", child: "I am Sam!", setting: "beach", props: ["duck", "wave"] },
    ],
    before: "Ask: what happens when you sit close to the sea?",
    after: "Ask: why did Tam run away, but Sam stay?",
  },
  {
    id: "w01-the-flying-mat",
    title: "The Flying Mat",
    week: 1,
    pages: [
      { text: "Tam the cat finds a little mat. It looks like any old mat.", child: "A mat!", setting: "room", props: ["cat", "mat"] },
      { text: "Tam sits on it, and the mat starts to wiggle.", child: "Tam sat.", setting: "room", props: ["cat", "mat"], payoff: "wiggle" },
      { text: "Up it goes, into the sky! {hero} jumps on too.", child: "I sat!", setting: "sky", props: ["mat", "cat"], parent: "Ask: where do you think the mat will go?" },
      { text: "They fly past a cloud. Sam the duck flies right beside them!", child: "Sam! Sam!", setting: "sky", props: ["cloud", "duck"] },
      { text: "But the mat is getting tired. Down, down, down it floats.", child: "The mat!", setting: "hill", props: ["mat", "cat"] },
      { text: "It lands softly at home. Tam curls up on it for a nap. What a trip!", child: "Tam sat.", setting: "room", props: ["mat", "cat"] },
    ],
    before: "Ask: if a mat could fly, where would you go?",
    after: "Ask: where did the mat fly? Why did it come down?",
  },
  {
    id: "w01-who-am-i",
    title: "Who Am I?",
    week: 1,
    pages: [
      { text: "It is dress-up day! Someone in a duck mask waddles in. Who is it?", child: "Sam! I am Sam!", setting: "room", props: ["mask"], parent: "The one in the mask is talking. Your child reads what they say." },
      { text: "Everyone cheers for Sam. Then someone in a cat mask tiptoes in.", child: "Tam! I am Tam!", setting: "room", props: ["duck", "mask"] },
      { text: "Everyone cheers for Tam. But wait: one more comes in, in a duck mask too!", child: "I am Sam!", setting: "room", props: ["cat", "mask"] },
      { text: "Two Sams? That can't be right. Who is really under that mask?", child: "Sam? Tam? Sam?", setting: "room", props: ["duck", "mask"], parent: "Ask: who do you think it is?" },
      { text: "Off comes the mask. It was {hero} all along! Everyone laughs.", child: "I am {hero}!", setting: "room", props: ["mask"], payoff: "bounce" },
    ],
    before: "Ask: have you ever dressed up as someone else?",
    after: "Ask: who was under the last mask? How did you know?",
  },

  // Week 2: i, p, n. Nest words: is, to.
  {
    id: "w02-pip-needs-a-nap",
    title: "Pip Needs a Nap",
    week: 2,
    pages: [
      { text: "Pip the pig is very sleepy. She snuggles into the soft hay.", child: "Nap, Pip, nap.", setting: "farm", props: ["pig", "hay"], parent: "Pip, Nan and Tim are new friends this week." },
      { text: "Just as her eyes close: tap, tap, tap! It is Nan the goat, kicking a can.", child: "Tap, tap, tap!", setting: "farm", props: ["goat", "can"] },
      { text: "Pip pokes her head out of the hay. She needs some quiet.", child: "Sit, Nan! Sit!", setting: "farm", props: ["pig", "goat"] },
      { text: "Nan sits. But now Sam the duck starts flapping and quacking.", child: "Sit, Sam!", setting: "farm", props: ["duck", "pig"] },
      { text: "Pip has an idea. She tells a story, very softly, and her friends begin to yawn.", child: "Nap, Nan. Nap, Sam.", setting: "farm", props: ["goat", "duck"] },
      { text: "Soon everyone is fast asleep in the hay, and Pip snores the loudest of all!", child: "Pip naps. Nan naps.", setting: "farm", props: ["pig", "hay"], payoff: "wiggle" },
    ],
    before: "Ask: what helps you fall asleep?",
    after: "Ask: what kept Pip awake? How did she get everyone to sleep?",
  },
  {
    id: "w02-pips-pancake",
    title: "Pip's Pancake",
    week: 2,
    pages: [
      { text: "Pip the pig wants to make a pancake. She gets out a pan.", child: "A pan! A pan!", setting: "room", props: ["pig", "pan"] },
      { text: "In goes the batter. Sizzle, sizzle!", child: "Tip it in, Pip.", setting: "room", props: ["pan", "pig"] },
      { text: "Pip flips it. Up, up goes the pancake, and it sticks to the ceiling!", child: "Is it in the pan?", setting: "room", props: ["pig", "pan"], payoff: "bounce", parent: "Ask: where did the pancake go?" },
      { text: "Pip looks up. Nan the goat comes in and looks up too.", child: "Nan is in.", setting: "room", props: ["goat", "pig"] },
      { text: "Drip, drop, flop! The pancake lands right on top of Nan's head.", child: "Tip it, Nan!", setting: "room", props: ["goat", "pan"], payoff: "topple" },
      { text: "Nan hands it back to Pip. Pip makes two more, and they eat every bite.", child: "Pip sits. Nan sits.", setting: "room", props: ["pig", "goat"] },
    ],
    before: "Ask: have you ever helped make pancakes?",
    after: "Ask: where did the pancake stick? Where did it land?",
  },
  {
    id: "w02-spin-pip-spin",
    title: "Spin, Pip, Spin!",
    week: 2,
    pages: [
      { text: "It is the night of the big dance. The stars are out, and Pip the pig loves to spin.", child: "Spin, Pip!", setting: "night", props: ["pig", "star"] },
      { text: "Pip spins once, and everyone claps.", child: "Pip spins!", setting: "night", props: ["pig"], payoff: "spin" },
      { text: "Pip spins again, faster and faster and faster.", child: "Spin, spin, spin!", setting: "night", props: ["pig"], payoff: "spin" },
      { text: "Oh dear. Now Pip is so dizzy that the stars are spinning too!", child: "Sit, Pip, sit!", setting: "night", props: ["pig", "star"], payoff: "wiggle" },
      { text: "Nan the goat brings her a cup of cool water.", child: "Sip it, Pip.", setting: "night", props: ["goat", "cup"] },
      { text: "When the stars stop spinning, Pip and Nan dance together, slowly this time.", child: "Nan spins. Pip spins.", setting: "night", props: ["goat", "pig"] },
    ],
    before: "Ask: what happens when you spin around and around?",
    after: "Ask: why did Pip have to sit down? What helped?",
  },
  {
    id: "w02-the-dripping-tap",
    title: "The Dripping Tap",
    week: 2,
    pages: [
      { text: "Drip, drip, drip. The tap in the garden is dripping.", child: "It is the tap.", setting: "meadow", props: ["tap"] },
      { text: "Tim the pup puts his paw on it, but the drops sneak out between his toes.", child: "Pat it, Tim.", setting: "meadow", props: ["dog", "tap"] },
      { text: "Tim sits right under the tap. Now the drips land on his nose! Plip!", child: "Tim sat in it.", setting: "meadow", props: ["dog", "tap"], payoff: "splash" },
      { text: "Nan the goat has an idea. She brings over a pan.", child: "A pan, Tim!", setting: "meadow", props: ["goat", "pan"] },
      { text: "Drip, drip into the pan, all day long, until the pan is full.", child: "It is in the pan.", setting: "meadow", props: ["pan", "tap"] },
      { text: "On a hot afternoon, Tim has a cool drink, all thanks to the dripping tap.", child: "Tim sips it.", setting: "meadow", props: ["dog", "pan"] },
    ],
    before: "Ask: have you heard a tap drip? What does it sound like?",
    after: "Ask: how did Nan help? What did Tim do with the water?",
  },

  // Week 3: o, d, c. Nest words: go, no, he.
  {
    id: "w03-dots-cap",
    title: "Dot's Cap",
    week: 3,
    pages: [
      { text: "Dot the hen has a new red cap. She wears it to the pond.", child: "Dot's cap!", setting: "pond", props: ["hen", "cap"] },
      { text: "Whoosh! The wind snatches the cap right off her head.", child: "Stop, cap, stop!", setting: "pond", props: ["cap", "hen"], payoff: "fly" },
      { text: "The cap sails over the water and lands on the pond. Away it floats.", child: "Not on Dot! On the pond!", setting: "pond", props: ["cap"] },
      { text: "Dot can't swim. She flaps and clucks on the bank.", child: "Sad Dot.", setting: "pond", props: ["hen"] },
      { text: "Then along paddles Sam the duck, wearing the red cap!", child: "Dot's cap on Sam!", setting: "pond", props: ["duck", "cap"], payoff: "bounce" },
      { text: "Sam swims back and gives the cap to Dot. She lets him wear it on Sundays.", child: "Dot is not sad.", setting: "pond", props: ["cap", "hen"] },
    ],
    before: "Ask: what would you do if the wind took your hat?",
    after: "Ask: who found the cap? Was that kind?",
  },
  {
    id: "w03-camping-night",
    title: "Camping Night",
    week: 3,
    pages: [
      { text: "Sam the duck goes camping under the stars. Up goes the tent.", child: "Sam and I camp.", setting: "night", props: ["duck", "tent"], parent: "'I' is the one telling the story: your child's animal." },
      { text: "For dinner, there is warm soup in a little pot.", child: "Sam sips it.", setting: "night", props: ["pot", "duck"] },
      { text: "Then, in the dark, there is a sound. Hoo! Hoo!", child: "Tam? Dot?", setting: "night", props: ["duck"] },
      { text: "Sam hides in the tent. {hero} peeks out with a lamp.", child: "Not Tam. Not Dot.", setting: "night", props: ["tent", "lamp"], parent: "Ask: what do you think is making the sound?" },
      { text: "Two big round eyes blink from a tree. It is an owl!", child: "It is not Tam!", setting: "night", props: ["owl", "tree"], payoff: "bounce" },
      { text: "The owl only wanted to say goodnight. Sam and {hero} snuggle into the tent and fall asleep.", child: "Sam naps and naps.", setting: "night", props: ["tent", "owl"] },
    ],
    before: "Ask: have you ever slept in a tent? What sounds might you hear at night?",
    after: "Ask: what made the sound? Why did Sam hide?",
  },
  {
    id: "w03-spots-for-tam",
    title: "Spots for Tam",
    week: 3,
    pages: [
      { text: "Pip the pig is painting. She paints one spot, then another.", child: "Spot, spot, spot!", setting: "room", props: ["pig"] },
      { text: "Pip paints spots on the mop...", child: "Spots on the mop!", setting: "room", props: ["mop", "pig"] },
      { text: "...and spots on the pot!", child: "Spots on the pot!", setting: "room", props: ["pot", "pig"] },
      { text: "Then Tam the cat walks by. Splat! Pip paints spots on Tam!", child: "Stop, Pip! Stop!", setting: "room", props: ["cat", "pig"], payoff: "wiggle", parent: "Ask: how do you think Tam feels?" },
      { text: "Tam is cross. She stomps off to look at herself.", child: "Mad Tam!", setting: "room", props: ["cat"] },
      { text: "But then Tam purrs. She likes her new spots after all!", child: "Tam's spots!", setting: "room", props: ["cat", "smile"] },
    ],
    before: "Ask: what would you paint spots on?",
    after: "Ask: was Tam cross at first? How did she feel at the end?",
  },
  {
    id: "w03-stop-sam",
    title: "Stop, Sam!",
    week: 3,
    pages: [
      { text: "Sam the duck wants to get to the pond, but the pond is across the road.", child: "Sam's pond!", setting: "road", props: ["duck"] },
      { text: "Sam steps out. Here comes a big bus!", child: "Stop, Sam, stop!", setting: "road", props: ["duck", "bus"] },
      { text: "Sam jumps back just in time. The bus rumbles past.", child: "Sam did stop.", setting: "road", props: ["bus"] },
      { text: "{hero} holds up a stop sign, and everything waits.", child: "Stop! Stop!", setting: "road", props: ["stopsign"], parent: "Ask: what does a stop sign tell us?" },
      { text: "Now Sam can cross, one flappy step at a time.", child: "Sam can go.", setting: "road", props: ["duck", "stopsign"] },
      { text: "Splash! Sam is in the pond at last. 'Thank you!' he quacks.", child: "In, Sam, in!", setting: "pond", props: ["duck"], payoff: "splash" },
    ],
    before: "Ask: what do we do before we cross a road?",
    after: "Ask: how did {hero} help Sam cross?",
  },

  // Week 4: u, g, h. Nest words: we, my, see.
  {
    id: "w04-tim-digs",
    title: "Tim Digs",
    week: 4,
    pages: [
      { text: "Pip the pig has lost her lucky nut. Tim the pup says he will dig until he finds it.", child: "Dig, Tim, dig!", setting: "farm", props: ["pig", "nut"] },
      { text: "He digs by the gate and finds an old hat.", child: "A hat! Not it.", setting: "farm", props: ["dog", "hat"] },
      { text: "He digs by the barn and finds a cup.", child: "A cup? Not it!", setting: "farm", props: ["cup", "dog"] },
      { text: "He digs and digs until he is covered in mud.", child: "Mud on Tim!", setting: "farm", props: ["dog", "dig"] },
      { text: "Then, plop! Out pops a nut. Pip's lucky nut!", child: "A nut! Tim dug it up!", setting: "farm", props: ["nut", "dog"], payoff: "bounce" },
      { text: "Tim gives the nut to Pip, and Pip gives Tim a big hug, mud and all.", child: "Pip hugs Tim.", setting: "farm", props: ["pig", "nut"] },
    ],
    before: "Ask: have you ever lost something special?",
    after: "Ask: what did Tim find before the nut?",
  },
  {
    id: "w04-up-the-hill",
    title: "Up the Hill",
    week: 4,
    pages: [
      { text: "Tam the cat wants to climb all the way to the top of the big hill.", child: "Up, up, up!", setting: "hill", props: ["cat"] },
      { text: "The sun shines down. It is so hot that Tam starts to pant.", child: "Hot sun! Hot, hot!", setting: "hill", props: ["sun", "cat"] },
      { text: "{hero} hands Tam a cup of cool water.", child: "A cup, Tam!", setting: "hill", props: ["cup", "cat"] },
      { text: "At last they reach the top! They can see for miles.", child: "Up on top!", setting: "hill", props: ["cat"], payoff: "bounce" },
      { text: "Then a big gray cloud rolls in, and the rain starts to fall.", child: "Sun? No sun!", setting: "hill", props: ["cloud", "rain"] },
      { text: "Tam and {hero} run down the hill, laughing, and the rain cools them off.", child: "Not hot, not hot!", setting: "hill", props: ["rain", "cat"] },
    ],
    before: "Ask: what do you do when you get too hot?",
    after: "Ask: what made it cool at the end?",
  },
  {
    id: "w04-the-big-hop",
    title: "The Big Hop",
    week: 4,
    pages: [
      { text: "A frog hops across the pond on big flat stones. Pip the pig wants to try.", child: "Hop, hop, hop!", setting: "pond", props: ["frog", "pig"] },
      { text: "Pip puts one foot on the first stone. It wobbles!", child: "Hop, Pip!", setting: "pond", props: ["rock", "pig"], payoff: "wiggle" },
      { text: "Pip hops, and lands in the mud with a big squelch.", child: "Pip is in the mud!", setting: "pond", props: ["pig"], payoff: "splash" },
      { text: "The frog laughs, but kindly. 'Small hops,' he says. 'One stone at a time.'", child: "Pip hops on it.", setting: "pond", props: ["frog", "pig"] },
      { text: "This time Pip goes slowly, and makes it all the way to the other side!", child: "Pip did it!", setting: "pond", props: ["pig", "rock"], payoff: "bounce" },
      { text: "Now Pip and the frog hop together every day, and {hero} counts the hops.", child: "We hop and hop.", setting: "pond", props: ["frog", "pig"] },
    ],
    before: "Ask: can you hop like a frog?",
    after: "Ask: what went wrong the first time? What helped Pip?",
  },
  {
    id: "w04-a-big-hug",
    title: "A Big Hug",
    week: 4,
    pages: [
      { text: "Tam the cat is sad today. Her friends want to cheer her up.", child: "Sad Tam.", setting: "meadow", props: ["cat"] },
      { text: "Pip the pig brings her a spinning top.", child: "Top, Tam?", setting: "meadow", props: ["pig", "top"], payoff: "spin" },
      { text: "Tim the pup brings her his map of the best puddles.", child: "Map, Tam?", setting: "meadow", props: ["dog", "map"] },
      { text: "Sam the duck brings a pot of warm soup.", child: "Pot, Tam?", setting: "meadow", props: ["duck", "pot"] },
      { text: "Tam shakes her head. No, no, no. What could she want?", child: "Hmm. Tam is sad.", setting: "meadow", props: ["cat"], parent: "Ask: what do you think Tam needs?" },
      { text: "{hero} knows. Everyone gives Tam a great big hug, and Tam purrs.", child: "Hug, hug, hug!", setting: "meadow", props: ["cat", "smile"], payoff: "bounce" },
    ],
    before: "Ask: what cheers you up when you feel sad?",
    after: "Ask: what did each friend bring? What did Tam need?",
  },
];

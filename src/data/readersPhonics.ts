import type { Story } from "./stories";

/**
 * Decodable readers for the sound-unit weeks, 15 to 26 (see units.ts): two
 * a week, each built around that week's new sounds. As with the letter
 * readers, a child is only asked to sound out a word whose sounds have been
 * taught; glue words and a few picture words are read by the app.
 * Checked by src/data/stories.test.ts.
 */
export const PHONICS_READERS: Story[] = [
  // Week 15: sh, ch
  {
    id: "w15-the-ship",
    title: "{hero} and the Ship",
    week: 15,
    pages: [
      { text: "{hero} has a ship. It is a big red ship.", setting: "beach", props: ["ship"], parent: "Two letters, one sound: s and h say 'sh'. Point to 'ship' and say sh-i-p." },
      { text: "Shh! A fish is on the ship. Hush, fish.", setting: "beach", props: ["ship", "fish"] },
      { text: "The ship can dash. Splash! The fish is wet.", setting: "beach", props: ["ship"], parent: "Ask: what sound does the sh make? Like a quiet 'shh'." },
      { text: "{hero} has a wish. A shell for the shelf!", setting: "beach", props: ["sand"] },
      { text: "A shell, a fish, and a ship. What a day, {hero}!", setting: "beach", props: ["ship", "fish"] },
    ],
    before: "This week two letters team up: s and h say 'sh'. Listen for it in ship.",
    after: "Ask: what did {hero} wish for? Can you find a word with sh on this page?",
  },
  {
    id: "w15-chick-in-the-shop",
    title: "A Chick in the Shop",
    week: 15,
    pages: [
      { text: "{hero} is in a shop. It is a snack shop.", setting: "road", props: ["shop"], parent: "c and h say 'ch', like a little sneeze. Point to 'chick'." },
      { text: "A chick is in the shop! Chip, chip, chip.", setting: "road", props: ["shop", "chick"] },
      { text: "The chick has a chip. Munch, munch. Crunch!", setting: "room", props: ["chick"] },
      { text: "Shh, chick. The shop man is not glad.", setting: "room", props: ["shop"], parent: "Ask: why is the shop man not glad?" },
      { text: "{hero} and the chick rush out. Such a fun lunch!", setting: "road", props: ["chick"] },
    ],
    before: "Ask: what do you see in a shop? Listen for 'ch' in chick and chip.",
    after: "Ask: what did the chick munch? Say 'ch' like a little sneeze.",
  },

  // Week 16: th, ng
  {
    id: "w16-the-long-path",
    title: "The Long Path",
    week: 16,
    pages: [
      { text: "{hero} is on a long path. It is a thin path.", setting: "hill", props: ["sun"], parent: "t and h say 'th'. Put your tongue behind your teeth: th, th. Point to 'path'." },
      { text: "Sing, {hero}! Sing a long song. La, la, la.", setting: "hill", props: [] },
      { text: "A moth! The moth has thin wings. Flap, flap.", setting: "meadow", props: ["moth"], parent: "n and g say 'ng', the sound at the end of ring and sing." },
      { text: "The path is long. {hero} is strong. Step, step.", setting: "hill", props: [] },
      { text: "Then, a ring! A ring on the path. Ding, ding!", setting: "hill", props: ["ring"] },
    ],
    before: "Two new sounds: th as in thumb and ng as in ring.",
    after: "Ask: what did {hero} find on the path? Sing a long song together.",
  },
  {
    id: "w16-bath-time",
    title: "Bath Time for {hero}",
    week: 16,
    pages: [
      { text: "Bath! {hero} is in the bath. Splish, splash.", setting: "room", props: ["bath"], parent: "Sound out 'bath': b-a-th. The th is one sound." },
      { text: "Splash, splash! The bath is thick with suds.", setting: "room", props: ["bath"] },
      { text: "A duck is in the bath. Quack! Bring the duck a ring.", setting: "room", props: ["duck", "ring"] },
      { text: "Sing in the bath, {hero}. Sing a bath song!", setting: "room", props: ["bath"], parent: "Ask: what do you sing in the bath?" },
      { text: "Then, out! {hero} is fresh. Long, long, long bath.", setting: "room", props: ["bed"] },
    ],
    before: "Ask: what is fun in the bath? Listen for th in bath and ng in sing.",
    after: "Ask: who was in the bath with {hero}?",
  },

  // Week 17: ck, ee
  {
    id: "w17-the-bee-and-the-tree",
    title: "The Bee and the Tree",
    week: 17,
    pages: [
      { text: "{hero} can see a tree. A bee is in the tree.", setting: "meadow", props: ["bee", "tree"], parent: "Two e's say 'ee', a long sound. Point to 'bee' and 'tree'." },
      { text: "Buzz! The bee has a need. The bee needs a seed.", setting: "meadow", props: ["bee"] },
      { text: "{hero} has a sack. A seed is in the sack. Peek!", setting: "meadow", props: ["bag"] },
      { text: "The bee sees the seed. Zip, zip! Back to the tree.", setting: "meadow", props: ["bee", "tree"], parent: "c and k say one 'k' sound at the end of back and sack." },
      { text: "Sleep, bee. Sleep in the tree. {hero} sits in the green grass.", setting: "meadow", props: ["bee", "tree"] },
    ],
    before: "This week ee says the long e sound, as in bee. Listen for it in tree and seed.",
    after: "Ask: what did the bee need? What can you see in a tree?",
  },
  {
    id: "w17-three-sheep",
    title: "Three Sheep",
    week: 17,
    pages: [
      { text: "{hero} sees three sheep. Three sheep sleep and sleep.", setting: "farm", props: ["sheep"], parent: "Sound out 'sheep': sh-ee-p. Two teams in one word!" },
      { text: "A sheep peeks. Then it jumps! Beep, beep, sheep.", setting: "farm", props: ["sheep"] },
      { text: "The sheep kick and skip. Quick, quick! Pick up the feet.", setting: "farm", props: ["sheep"] },
      { text: "{hero} has a duck. The duck is on a deck. Cluck, cluck, hen!", setting: "farm", props: ["duck", "hen"], parent: "Ask: how many sheep are there? Count them: one, two, three." },
      { text: "Three sheep, a duck, and a hen. What a week, {hero}!", setting: "farm", props: ["sheep", "duck"] },
    ],
    before: "Ask: what does a sheep say? Listen for ee in sheep and ck in duck.",
    after: "Ask: what did the sheep do? Say 'quick' and 'kick' fast.",
  },

  // Week 18: oo
  {
    id: "w18-the-moon",
    title: "{hero} and the Moon",
    week: 18,
    pages: [
      { text: "The moon is up. {hero} can see the moon from the room.", setting: "night", props: ["moon"], parent: "Two o's say 'oo', as in moon. Point to 'moon' and 'room'." },
      { text: "Hoot! Who is on the roof? Hoot, hoot, hoot.", setting: "night", props: ["owl"] },
      { text: "{hero} has a spoon and a cool drink. Sip. Soon, sleep.", setting: "room", props: ["cup", "moon"] },
      { text: "Zoom! A jet went by the moon. Zoom, zoom, zoom.", setting: "night", props: ["jet", "moon"], parent: "Ask: what else is up in the sky at night?" },
      { text: "The moon is a big cool ball. Sleep well, {hero}.", setting: "night", props: ["moon", "bed"] },
    ],
    before: "This week oo says the sound in moon. Listen for it in room and zoom.",
    after: "Ask: what did {hero} see from the room? Say 'moon' slow: m-oo-n.",
  },
  {
    id: "w18-the-zoo",
    title: "Off to the Zoo",
    week: 18,
    pages: [
      { text: "{hero} is off to the zoo. Zoom went the bus. Toot, toot!", setting: "road", props: ["bus"], parent: "Sound out 'zoo': z-oo. The oo is one long sound." },
      { text: "A goat is at the zoo. It has a boot! A boot on its hoof.", setting: "farm", props: ["goat", "boot"] },
      { text: "A big fish is in the pool. Splash! It is a cool pool.", setting: "pond", props: ["fish"] },
      { text: "Food! {hero} has food on a spoon. Yum, yum.", setting: "meadow", props: ["cup"], parent: "Ask: what food would you bring to the zoo?" },
      { text: "Soon it is dusk. Bye, zoo! Zoom went the bus.", setting: "road", props: ["bus", "moon"] },
    ],
    before: "Ask: what lives at a zoo? Listen for oo in zoo, pool and food.",
    after: "Ask: what did the goat have? What was in the pool?",
  },

  // Week 19: ai, ay
  {
    id: "w19-rain-rain",
    title: "Rain, Rain",
    week: 19,
    pages: [
      { text: "Rain! Rain on the hill. {hero} can wait in the tent.", setting: "hill", props: ["rain", "tent"], parent: "a and i say 'ay', as in rain. Point to 'rain' and 'wait'." },
      { text: "A snail is in the rain. The snail has a trail. Wait, snail.", setting: "meadow", props: ["snail", "rain"] },
      { text: "Drip, drip on the pail. The pail is full. Sail, pail!", setting: "pond", props: ["rain", "boat"] },
      { text: "The rain stops. {hero} can paint. Paint a snail, paint a tail!", setting: "meadow", props: ["snail"], parent: "Ask: what would you paint after the rain?" },
      { text: "A day of rain, a day to paint. Not a bad day, {hero}!", setting: "meadow", props: ["sun"] },
    ],
    before: "This week ai and ay both say 'ay'. Listen for them in rain and day.",
    after: "Ask: what did the snail leave behind? What did {hero} paint?",
  },
  {
    id: "w19-hay-day",
    title: "Hay Day",
    week: 19,
    pages: [
      { text: "It is a hay day! {hero} can play in the hay all day.", setting: "farm", props: ["hay"], parent: "a and y say 'ay' at the end of a word: hay, day, play." },
      { text: "Stay, {hero}! A hen lays an egg in the hay. Way to go, hen.", setting: "farm", props: ["hen", "egg"] },
      { text: "May I nap? The hay is soft. {hero} may nap in the hay.", setting: "farm", props: ["hay"] },
      { text: "The mail van is on the way. Wait! A pail for {hero}. Hooray!", setting: "farm", props: ["van"], parent: "Ask: what might be in the pail?" },
      { text: "Rain and sun, hay and play. {hero} can play all day!", setting: "farm", props: ["hay", "sun"] },
    ],
    before: "Ask: what can you do with hay? Listen for ay in hay, day and play.",
    after: "Ask: what did the hen do in the hay? Say 'hay day' three times.",
  },

  // Week 20: oa, igh
  {
    id: "w20-the-goat-on-the-boat",
    title: "The Goat on the Boat",
    week: 20,
    pages: [
      { text: "A goat is on a boat. {hero} is on the boat too. Float, boat!", setting: "pond", props: ["goat", "boat"], parent: "o and a say 'oh', as in boat. Point to 'goat' and 'boat'." },
      { text: "The boat floats up the road? No! A boat floats on the pond.", setting: "pond", props: ["boat"] },
      { text: "The goat has a coat. It is a soft coat. Cozy goat.", setting: "pond", props: ["goat"] },
      { text: "A toad hops on the boat. Croak! The goat and the toad. Oh no!", setting: "pond", props: ["frog", "boat"], parent: "Ask: what do a goat, a toad and a boat have in common? The oa sound!" },
      { text: "The boat floats home. Soap, bath, and bed for the goat. Night, {hero}.", setting: "night", props: ["boat", "moon"] },
    ],
    before: "This week oa says 'oh', as in boat, and igh says 'eye', as in light.",
    after: "Ask: who hopped on the boat? Sound out 'goat': g-oa-t.",
  },
  {
    id: "w20-a-light-at-night",
    title: "A Light at Night",
    week: 20,
    pages: [
      { text: "It is night. {hero} has a light. A bright, bright light.", setting: "night", props: ["light", "night"], parent: "Three letters, one sound: i, g and h say 'eye', as in light." },
      { text: "The light is high. High up on the hill. What a sight!", setting: "night", props: ["light", "moon"] },
      { text: "Right! A bat. It has a tight grip on the oak. Sigh, bat.", setting: "night", props: ["bat"] },
      { text: "{hero} might see a star. High, high in the night. Wish on it!", setting: "night", props: ["star", "light"], parent: "Ask: what would you wish on a star?" },
      { text: "The light is off. Night, night. Sleep tight, {hero}.", setting: "room", props: ["bed", "moon"] },
    ],
    before: "Ask: what do you see at night? Listen for igh in light, night and bright.",
    after: "Ask: what did {hero} see on the oak? Say 'sleep tight'.",
  },

  // Week 21: a_e, i_e
  {
    id: "w21-a-cake-for-kate",
    title: "A Cake at the Gate",
    week: 21,
    pages: [
      { text: "{hero} made a cake. A big cake with a name on it.", setting: "room", props: ["cake"], parent: "The e at the end is silent, and it makes the a say its name: cake, made, name." },
      { text: "Take the cake to the gate. Wait at the gate. Do not be late!", setting: "road", props: ["cake", "gate"] },
      { text: "A snake! A snake by the gate. The snake wants the cake.", setting: "meadow", props: ["gate"] },
      { text: "No, snake. {hero} gave the snake a grape. Same shape, small size.", setting: "meadow", props: ["grape"], parent: "Ask: what shape is a cake? What shape is a grape?" },
      { text: "The cake is safe. {hero} and a pal ate the cake. Yum!", setting: "room", props: ["cake", "smile"] },
    ],
    before: "This week a silent e at the end makes a say 'ay' (cake) and i say 'eye' (kite).",
    after: "Ask: who wanted the cake? Point to the quiet e at the end of 'cake'.",
  },
  {
    id: "w21-ride-the-bike",
    title: "Ride the Bike, Fly the Kite",
    week: 21,
    pages: [
      { text: "{hero} has a bike and a kite. Time to ride! Time to fly!", setting: "hill", props: ["bike", "kite"], parent: "The quiet e makes i say its name: bike, kite, ride, time." },
      { text: "Ride, ride, ride up the hill. The bike is fine. Five, six, seven!", setting: "hill", props: ["bike"] },
      { text: "The kite is red. It hides up high. Then it dives. Yes!", setting: "sky", props: ["kite", "cloud"] },
      { text: "Smile, {hero}! The kite is wide and the line is long. Fine!", setting: "sky", props: ["kite", "smile"], parent: "Ask: what makes a kite fly?" },
      { text: "Time to go. Ride the bike home. Nine miles? No, just one!", setting: "road", props: ["bike", "sun"] },
    ],
    before: "Ask: have you seen a kite fly? Listen for the quiet e in bike, kite and ride.",
    after: "Ask: where did the kite hide? Say 'ride the bike' fast.",
  },

  // Week 22: o_e, u_e
  {
    id: "w22-a-bone-and-a-rope",
    title: "A Bone and a Rope",
    week: 22,
    pages: [
      { text: "{hero} has a rope. A dog has a bone. Hello, dog!", setting: "meadow", props: ["rope", "bone"], parent: "The quiet e makes o say its name: bone, rope, home, nose." },
      { text: "The dog hides the bone in a hole. The dog pokes its nose in. Sniff!", setting: "meadow", props: ["dog", "bone"] },
      { text: "{hero} makes a note: bone in the hole, by the stone.", setting: "meadow", props: ["dog"] },
      { text: "A tug on the rope! The dog woke up. It wants to go home.", setting: "road", props: ["rope", "dog"], parent: "Ask: where did the dog hide the bone?" },
      { text: "Home at last. The bone, the rope, the dog, and {hero}. Cozy!", setting: "room", props: ["bone", "lamp"] },
    ],
    before: "This week a silent e makes o say 'oh' (bone) and u say 'you' (cube).",
    after: "Ask: what did the dog do with the bone? Point to the quiet e in 'rope'.",
  },
  {
    id: "w22-a-cute-tune",
    title: "A Cute Tune",
    week: 22,
    pages: [
      { text: "{hero} has a flute. Toot! The flute plays a tune. A cute tune.", setting: "room", props: ["tune"], parent: "The quiet e makes u say 'you': cute, tune, cube, mule." },
      { text: "A cube! A red cube. Tap the cube to the tune. Tap, tap, tap.", setting: "room", props: ["cube", "drum"] },
      { text: "A mule likes the tune. The mule is big! It hums. Hmm, hmm.", setting: "farm", props: ["tune"] },
      { text: "Use the flute, {hero}. Use the cube. The mule wants more!", setting: "farm", props: ["cube", "tune"], parent: "Ask: what can you use to make a tune?" },
      { text: "June is a fine time for a tune. Toot, tap, hum. The end!", setting: "meadow", props: ["sun", "tune"] },
    ],
    before: "Ask: what makes a tune? Listen for the quiet e in cute, tune and cube.",
    after: "Ask: who hummed along? Hum a cute tune together.",
  },

  // Week 23: ar, or
  {
    id: "w23-star-in-the-jar",
    title: "A Star in a Jar",
    week: 23,
    pages: [
      { text: "{hero} is in the yard. It is dark. Stars are far, far up.", setting: "night", props: ["star", "night"], parent: "a and r say 'ar', as in star. Point to 'star', 'dark' and 'far'." },
      { text: "A jar! {hero} has a jar. Can a star fit in a jar?", setting: "night", props: ["jar", "star"] },
      { text: "A spark! A tiny light in the jar. It is a bug, not a star. Ha!", setting: "night", props: ["jar", "bug"] },
      { text: "Park the jar in the barn. The bug is not harmed. Go, bug!", setting: "farm", props: ["jar"], parent: "Ask: why did {hero} let the bug go?" },
      { text: "Back to the car. Stars are far. Home is not far. Night, {hero}.", setting: "night", props: ["car", "star"] },
    ],
    before: "This week ar says 'ar', as in star, and or says 'or', as in fork.",
    after: "Ask: what was in the jar? Say 'star' slow: s-t-ar.",
  },
  {
    id: "w23-corn-with-a-fork",
    title: "Corn with a Fork",
    week: 23,
    pages: [
      { text: "Corn! {hero} has corn. Corn and a fork. Fork the corn.", setting: "farm", props: ["corn", "fork"], parent: "o and r say 'or', as in fork. Point to 'corn' and 'fork'." },
      { text: "A storm! The sky is dark. Run to the porch, {hero}!", setting: "farm", props: ["cloud", "rain"] },
      { text: "The storm is short. The sun is back. Horns toot on the farm.", setting: "farm", props: ["sun", "corn"] },
      { text: "A hen was born in the barn. It is small and hard to see. Cheep!", setting: "farm", props: ["hen", "chick"], parent: "Ask: what was born in the barn?" },
      { text: "More corn, {hero}? Yes! Fork the corn. Yum, yum, yum.", setting: "farm", props: ["corn", "fork"] },
    ],
    before: "Ask: what do you eat with a fork? Listen for or in corn, fork and storm.",
    after: "Ask: what came after the storm? Say 'fork the corn'.",
  },

  // Week 24: er, ir
  {
    id: "w24-the-bird-and-the-fern",
    title: "The Bird and the Fern",
    week: 24,
    pages: [
      { text: "A bird sits on a fern. The fern is green. Chirp, chirp!", setting: "meadow", props: ["bird", "fern"], parent: "e and r say 'er', as in fern. i and r say 'er' too, as in bird." },
      { text: "{hero} is the first to see it. A bird with a red shirt? No, a red bird!", setting: "meadow", props: ["bird", "shirt"] },
      { text: "The bird sips water from the river. Then it twirls. Twirl, bird!", setting: "pond", props: ["bird"] },
      { text: "Dirt on the fern! The bird kicks the dirt. Sister bird helps.", setting: "meadow", props: ["fern"], parent: "Ask: how does a bird keep a fern clean?" },
      { text: "Under the fern, a nest. Better and better! Chirp, chirp, {hero}.", setting: "meadow", props: ["nest", "bird"] },
    ],
    before: "This week er and ir both say 'er'. Listen for them in fern and bird.",
    after: "Ask: what was under the fern? Say 'bird' slow: b-ir-d.",
  },
  {
    id: "w24-the-red-shirt",
    title: "{hero} in the Red Shirt",
    week: 24,
    pages: [
      { text: "{hero} has a red shirt. The shirt is a bit big. It is a sister's shirt.", setting: "room", props: ["shirt"], parent: "Sound out 'shirt': sh-ir-t. Two teams in one word." },
      { text: "Stir, stir! {hero} stirs the dinner in the red shirt. Yum.", setting: "room", props: ["shirt", "pan"] },
      { text: "Dirt! A spot of dirt on the shirt. Oh no. Rub, rub, rub.", setting: "room", props: ["shirt"] },
      { text: "Hang the shirt after dinner. The wind is a good helper. Swish!", setting: "meadow", props: ["shirt", "sun"], parent: "Ask: how does the wind help a wet shirt?" },
      { text: "The shirt is fresh. Better than ever! Third time is the best, {hero}.", setting: "room", props: ["shirt", "smile"] },
    ],
    before: "Ask: what is your best shirt? Listen for ir in shirt, stir and dirt.",
    after: "Ask: what did {hero} stir? What got on the shirt?",
  },

  // Week 25: ea, ou
  {
    id: "w25-at-the-beach",
    title: "A Day at the Beach",
    week: 25,
    pages: [
      { text: "{hero} is at the beach. The sea is cool. Eat a peach, {hero}!", setting: "beach", props: ["sun", "seal"], parent: "e and a say 'ee', as in leaf. Point to 'beach', 'sea' and 'eat'." },
      { text: "A seal! A seal in the sea. It leaps. Then it sleeps on the sand.", setting: "beach", props: ["seal", "sand"] },
      { text: "A leaf floats by. Then a cloud. Then a loud, loud sound. Boom!", setting: "beach", props: ["leaf", "cloud"] },
      { text: "{hero} shouts, Out of the sea! Round the sand, up the mound. Safe!", setting: "beach", props: ["cloud", "rain"], parent: "Ask: what makes a loud sound at the beach?" },
      { text: "The sea is calm. A clean beach, a neat seat, a peach to eat. Ahh.", setting: "beach", props: ["seal", "sun"] },
    ],
    before: "This week ea says 'ee', as in leaf, and ou says 'ow', as in cloud.",
    after: "Ask: what did the seal do? Say 'beach' slow: b-ea-ch.",
  },
  {
    id: "w25-a-mouse-in-the-house",
    title: "A Mouse in the House",
    week: 25,
    pages: [
      { text: "A mouse is in the house! {hero} found it. A small gray mouse.", setting: "room", props: ["mouse"], parent: "o and u say 'ow', as in cloud. Point to 'mouse', 'house' and 'found'." },
      { text: "The mouse is loud. Squeak! It runs round and round the couch.", setting: "room", props: ["mouse", "lamp"] },
      { text: "Shout, {hero}! Out, mouse, out! The mouse hides in a pouch.", setting: "room", props: ["mouse", "bag"] },
      { text: "A bean! The mouse eats a bean. Then a pea. What a meal, mouse.", setting: "room", props: ["mouse"], parent: "Ask: what does a mouse like to eat?" },
      { text: "Out of the house, mouse! Out to the ground. The house is neat and clean.", setting: "meadow", props: ["mouse", "sun"] },
    ],
    before: "Ask: have you seen a mouse? Listen for ou in mouse, house and out.",
    after: "Ask: where did the mouse hide? What did it eat?",
  },

  // Week 26: oi, wh
  {
    id: "w26-the-coin",
    title: "The Coin",
    week: 26,
    pages: [
      { text: "{hero} found a coin. A gold coin in the soil. Oh boy!", setting: "meadow", props: ["coin"], parent: "o and i say 'oy', as in coin. Point to 'coin' and 'soil'." },
      { text: "The coin is dirty. Boil water. Wash the coin. It shines!", setting: "room", props: ["coin", "cup"] },
      { text: "Join {hero} at the shop. What can a coin buy? A toy? A tune?", setting: "road", props: ["shop", "coin"] },
      { text: "Point to it, {hero}! A whistle! A whale whistle. Whee, whee!", setting: "road", props: ["whale", "coin"], parent: "w and h say 'wuh' together, as in whale and whistle." },
      { text: "One coin, one whistle, one happy {hero-kind}. What a noise!", setting: "meadow", props: ["whale", "smile"] },
    ],
    before: "The last two teams: oi says 'oy', as in coin, and wh says 'wuh', as in whale.",
    after: "Ask: what did the coin buy? Say 'coin' slow: c-oi-n.",
  },
  {
    id: "w26-the-whale-and-the-wheel",
    title: "The Whale and the Wheel",
    week: 26,
    pages: [
      { text: "A whale! {hero} sees a whale in the sea. What a big whale!", setting: "beach", props: ["whale"], parent: "Sound out 'whale': wh-a-l-e, with a quiet e at the end." },
      { text: "The whale has a wheel? No! It is a boat with a wheel. Which boat? That boat!", setting: "beach", props: ["boat", "wheel"] },
      { text: "Spin the wheel, {hero}. The boat spins. Whee! The whale swims by.", setting: "beach", props: ["wheel", "whale"] },
      { text: "The whale points its tail up. Splash! Oil on the deck. Whoa, slick!", setting: "beach", props: ["whale"], parent: "Ask: what did the whale do with its tail?" },
      { text: "Time to go home. The whale waves. Bye, whale! Bye, wheel! Bye, {hero}!", setting: "beach", props: ["whale", "sun"] },
    ],
    before: "Ask: what is the biggest animal in the sea? Listen for wh in whale, wheel and which.",
    after: "Ask: what turned the boat? Say 'whale' and 'wheel'.",
  },
];

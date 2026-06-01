VAR trust = 0
VAR visited_memory = false
VAR acknowledged_silence = false
VAR hospital_clarity = false
VAR reborn = 0

-> start

=== start ===
# objects: lamp
# audio soundtrack_1.mp3
# position: (0, 0)
# fog: 1.0

{
    - reborn == 3:
        The crossroads returns almost before you ask for it. The lamp is waiting, patient as a held breath.
    - reborn == 2:
        Again, the dream folds you back to the lamp. Its light knows the shape of your shadow now.
    - reborn == 1:
        You wake inside the same dim clearing, though the fog has learned your name without speaking it.
    - else:
        You stand where four paths meet. A single lamp burns in the fog, too steady for this place.
}

A voice gathers at the edge of hearing.

"You came through the dark. I felt the air change when you arrived."

* [Step into the lamp's circle.]
    -> trust_path_1
* [Follow the metallic pulse in the mist.]
    -> memory_path_1
* [Stay quiet until the fog answers.]
    ~ acknowledged_silence = true
    -> silence_path_1
* [Walk away from the lamp and into uncertainty.]
    -> uncertain_path_1

////////////////////////////////////////////////////////
// TRUST PATH: from (0,0) to (90,0)
////////////////////////////////////////////////////////

=== trust_path_1 ===
# objects: lamp
# position: (20,0)
# fog: 0.95
You step closer to the lamp. Its light does not brighten, but it begins to feel less alone.

The voice follows carefully:

"There was another light once. White, buzzing, always above me. This one is kinder."

* [Tell the voice you will stay near the light.]
    ~ trust += 1
    -> trust_path_1_still
* [Ask what made the other light cruel.]
    -> trust_path_2
* [Answer by standing still inside the glow.]
    ~ acknowledged_silence = true
    -> trust_path_1_still

=== trust_path_1_still ===
# objects: lamp
The lamp hums through the soles of your feet. The voice takes your stillness as permission, not refusal.

-> trust_path_2

=== trust_path_2 ===
# objects: geometric, hand, hand
# position: (40,0)
# fog: 0.8
Two pale hands surface in the fog, not reaching for you so much as remembering how to reach.

"Someone kept adjusting things above me. Tubes, maybe. Straps. I remember their fingers before I remember their face."

* [Treat the remembered hands as careful, not threatening.]
    ~ trust += 1
    -> trust_path_2a
* [Look for the face the voice cannot keep.]
    -> trust_path_2a
* [Let the hands pass without naming them.]
    ~ acknowledged_silence = true
    -> trust_path_2a

=== trust_path_2a ===
The hands dissolve into thin green light. The path ahead steadies under your attention.

-> trust_path_3

=== trust_path_3 ===
# audio soundtrack_2.mp3
# objects: hand
# position: (60,0)
# fog: 0.6
The fog thins enough to show your own footsteps behind you.

"When you choose gently, the room in me becomes less sharp."

* [Offer the gentleness on purpose.]
    ~ trust += 1
    -> trust_path_3a
* [Follow the clearer ground without speaking.]
    -> trust_path_3a
* [Pull back before the voice depends on you.]
    ~ trust -= 1
    -> trust_path_3a

=== trust_path_3a ===
A warm current moves outward from the lamp, touching each marker you have passed.

-> trust_path_4

=== trust_path_4 ===
# objects: hand, hand, hand
# position: (80,0)
# fog: 0.3
# audio soundtrack_2.mp3
The hands return in a slow orbit, three soft signs around a body neither of you can see.

{
    - trust > 2:
        "I think I was held together by people who were afraid to lose me. You feel different, but you are holding something too."
    - else:
        "I cannot tell whether care saved me or only delayed the leaving. Still, your attention makes a shape I can stand inside."
}

* [Accept the fragile bond without trying to own it.]
    ~ trust += 1
    -> trust_path_4a
* [Ask what the voice wants you to carry forward.]
    -> trust_path_4a
* [Let the orbit continue in silence.]
    ~ acknowledged_silence = true
    -> trust_path_4a

=== trust_path_4a ===
# objects:
The last hand fades. What remains is not emptiness; it is room.

-> trust_path_5

=== trust_path_5 ===
# position: (90,0)
# fog: 0.15
The path opens into a clearing where the lamp is only a memory of warmth behind you.

"If I am fading, then perhaps this is how fading should feel: witnessed, but not trapped."

~ reborn = reborn + 1

{
    - (trust > 2):
        -> trust_ending_warm
    - hospital_clarity:
        -> trust_ending_reflective
    - else:
        -> trust_ending_distant
}

=== trust_ending_warm ===
# objects: hand
# position: (90,2)
# fog: 0.05
# audio soundtrack_3.mp3
A single hand of light unfolds above the clearing, palm open, asking for nothing.

"You did not fix me. You stayed long enough for me to stop being afraid of vanishing."

-> dream_or_wake_up

=== trust_ending_reflective ===
# objects: hospital
# position: (90,2)
# fog: 0.08
# audio soundtrack_3.mp3
A bedrail shape glints in the grass, then softens until it could be moonlight.

"The room was real, then. So was the care. So is this strange mercy of being seen after it."

-> dream_or_wake_up

=== trust_ending_distant ===
# position: (90,2)
# fog: 0.15
# audio soundtrack_3.mp3
The clearing keeps its distance, gentle but wide.

"Maybe we were only two lights passing through fog. Even that is more than nothing."

-> dream_or_wake_up

////////////////////////////////////////////////////////
// MEMORY PATH: from (0,0) to (0,90)
////////////////////////////////////////////////////////

=== memory_path_1 ===
# objects: geometric
# position: (0,20)
# fog: 0.95
You follow the metallic pulse. Rectangles gather in the vapor, then tilt away before they become walls.

"The sound came in pieces. A machine keeping count. Shoes stopping outside a door."

* [Name the room as a hospital.]
    ~ hospital_clarity = true
    ~ visited_memory = true
    -> memory_path_1a
* [Let the room remain unfinished.]
    ~ visited_memory = true
    -> memory_path_1a
* [Listen for the machine beneath the fog.]
    ~ acknowledged_silence = true
    ~ visited_memory = true
    -> memory_path_1a

=== memory_path_1a ===
The pulse answers with a faint click, like a latch opening somewhere too far away.

-> memory_path_2

=== memory_path_2 ===
# audio soundtrack_2.mp3
# objects: hospital, geometric
# position: (0,40)
# fog: 0.8
Clinical shapes rise from the ground: a rail, a hanging bag, a square of cold ceiling.

"No face stays. Only gestures. Someone checked the numbers and touched my wrist before leaving."

* [Say that the touch mattered.]
    ~ trust += 1
    ~ hospital_clarity = true
    -> memory_path_2a
* [Search the shapes for what they are hiding.]
    -> memory_path_2a
* [Stand beside the bed-shape without judgment.]
    ~ acknowledged_silence = true
    -> memory_path_2a

=== memory_path_2a ===
# objects:
The rail lowers itself into the fog, no longer a barrier, not quite a bridge.

-> memory_path_3

=== memory_path_3 ===
# objects: hand, hand
# position: (0,60)
# fog: 0.5
Two handprints appear on the invisible glass between then and now.

"I kept trying to wake into a room that would not keep still."

* [Press your palm to the nearest handprint.]
    ~ trust += 1
    -> memory_path_3a
* [Ask what waking felt like.]
    -> memory_path_3a
* [Breathe slowly until the handprints stop shaking.]
    ~ acknowledged_silence = true
    -> memory_path_3a

=== memory_path_3a ===
The glass is gone when you look again. Your palm is cold, but not empty.

-> memory_path_4

=== memory_path_4 ===
# objects: hospital
# position: (0,80)
# fog: 0.3
The hospital symbols lose their edges. They become weather, then architecture, then almost kindness.

{
    - trust > 2:
        "I know now that I was not abandoned. Fear made the room look empty."
    - else:
        "I cannot prove anyone stayed. But the memory of touch keeps arguing with the fear."
}

* [Anchor the memory to care instead of terror.]
    ~ trust += 1
    ~ hospital_clarity = true
    -> memory_path_4a
* [Admit that memory can be incomplete and still true.]
    -> memory_path_4a
* [Keep watch until the shapes settle.]
    ~ acknowledged_silence = true
    -> memory_path_4a

=== memory_path_4a ===
# objects: geometric, hospital
The ceiling square opens into sky. The machine-count becomes part of the music.

-> memory_path_5

=== memory_path_5 ===
# objects: geometric, hospital
# position: (0,90)
# fog: 0.15
A pale corridor stretches ahead, but it no longer insists on being entered.

"Some doors are remembered only because someone kept opening them for us."

~ reborn = reborn + 1

{
    - (trust > 2):
        -> memory_ending_warm
    - hospital_clarity:
        -> memory_ending_reflective
    - else:
        -> memory_ending_distant
}

=== memory_ending_warm ===
# objects: hand
# position: (0,92)
# fog: 0.05
# audio soundtrack_3.mp3
The handprints become small lights along the corridor floor.

"If I had to be carried, then let me remember the carrying. Let that be the final room."

-> dream_or_wake_up

=== memory_ending_reflective ===
# objects: hospital
# position: (0,92)
# fog: 0.08
# audio soundtrack_3.mp3
The corridor folds into a quiet ward with no walls, only breathable space.

"A hospital is not only pain. Sometimes it is the shape care takes when time is running out."

-> dream_or_wake_up

=== memory_ending_distant ===
# objects:
# position: (0,92)
# fog: 0.15
# audio soundtrack_3.mp3
The corridor dims before it can offer certainty.

"I wanted the past to become clear. Perhaps it is enough that it became softer."

-> dream_or_wake_up

////////////////////////////////////////////////////////
// SILENCE PATH: from (0,0) to (-90,0)
////////////////////////////////////////////////////////

=== silence_path_1 ===
# objects:
# position: (-20,0)
# fog: 0.95
You do not answer the voice. The fog shifts anyway, slow and attentive.

"There. That is different. Most things in dreams demand a name. You let me remain unfinished."

* [Keep the silence open.]
    ~ acknowledged_silence = true
    -> silence_path_1a
* [Move quietly, careful not to break the hush.]
    -> silence_path_2
* [Ask one small question about the buzzing light.]
    ~ trust += 1
    -> silence_path_2

=== silence_path_1a ===
# objects:
The hush gathers around you like a room with all the furniture removed.

-> silence_path_2

=== silence_path_2 ===
# audio soundtrack_2.mp3
# objects: hand, geometric
# position: (-40,0)
# fog: 0.8
Shapes appear only at the edge of vision. A hand. A frame. The suggestion of a monitor.

"Silence was not empty there either. It had machines in it. Breathing. Shoes. A pause before bad news."

* [Let the machines become part of the quiet.]
    ~ acknowledged_silence = true
    -> silence_path_2a
* [Offer warmth without adding words.]
    ~ trust += 1
    -> silence_path_2a
* [Look for the person behind the pause.]
    ~ hospital_clarity = true
    -> silence_path_2a

=== silence_path_2a ===
# objects:
For a moment the whole world seems to inhale with you.

-> silence_path_3

=== silence_path_3 ===
# objects:
# position: (-60,0)
# fog: 0.6
The ground beneath the fog pulses in a rhythm too slow to be a heartbeat, too tender to be weather.

"I thought silence meant no one was coming. But you are here, and you are quiet, and I am less alone."

* [Stay until the rhythm steadies.]
    ~ acknowledged_silence = true
    -> silence_path_3a
* [Say only that you are here.]
    ~ trust += 1
    -> silence_path_3a
* [Listen for the room beyond the rhythm.]
    -> silence_path_3a

=== silence_path_3a ===
# objects:
The rhythm settles into the path ahead.

-> silence_path_4

=== silence_path_4 ===
# objects: hand
# position: (-80,0)
# fog: 0.3
# audio soundtrack_2.mp3
A single hand rises, palm down, like someone dimming a lamp for rest.

{
    - trust > 2:
        "You have taught the quiet to hold me instead of erase me."
    - else:
        "I still do not know what I am, but I know the quiet can have company."
}

* [Rest beside the hand until it lowers.]
    ~ acknowledged_silence = true
    -> silence_path_4a
* [Let the shared quiet become trust.]
    ~ trust += 1
    -> silence_path_4a
* [Watch without deciding what the hand means.]
    -> silence_path_4a

=== silence_path_4a ===
The hand lowers into the mist. The path remains, clean and narrow.

-> silence_path_5

=== silence_path_5 ===
# position: (-90,0)
# fog: 0.15
The quiet opens into a wide basin of dim light.

"You did not fill the silence. You stayed with it until it stopped being a threat."

~ reborn = reborn + 1

{
    - (trust > 2):
        -> silence_ending_warm
    - hospital_clarity:
        -> silence_ending_reflective
    - else:
        -> silence_ending_distant
}

=== silence_ending_warm ===
# position: (-90,2)
# fog: 0.05
# audio soundtrack_3.mp3
The basin glows from below, each ripple answering the next.

"If there is a last sound, I hope it is like this: someone breathing nearby, unafraid."

-> dream_or_wake_up

=== silence_ending_reflective ===
# objects: hospital
# position: (-90,2)
# fog: 0.08
# audio soundtrack_3.mp3
A monitor-light blinks once under the water, then becomes a star.

"The machines were counting down, maybe. But they were also proof that someone was still counting me."

-> dream_or_wake_up

=== silence_ending_distant ===
# objects:
# position: (-90,2)
# fog: 0.15
# audio soundtrack_3.mp3
The basin keeps its secrets, but it no longer feels hostile.

"I cannot follow you past this quiet. I can only be grateful that you crossed it with me."

-> dream_or_wake_up

////////////////////////////////////////////////////////
// UNCERTAINTY PATH: from (0,0) to (0,-90)
////////////////////////////////////////////////////////

=== uncertain_path_1 ===
# objects:
# position: (0,-20)
# fog: 0.95
You leave the lamp behind. The fog thickens, but the dark has texture now.

"I do not know whether this is memory or invention. I only know it hurts less when we look at it."

* [Keep walking without demanding an answer.]
    -> uncertain_path_2
* [Invite the fog to show whatever it can.]
    -> uncertain_path_2
* [Say nothing and accept the unfinished path.]
    ~ acknowledged_silence = true
    -> uncertain_path_1a

=== uncertain_path_1a ===
# objects:
Your silence does not clear the fog. It makes the fog honest.

-> uncertain_path_2

=== uncertain_path_2 ===
# objects: hand, hand, hand
# position: (0,-40)
# fog: 0.8
Three hands flicker in different directions, each one almost a guide and almost a warning.

"There were footsteps. There were adjustments. There was a smell like clean metal. None of it agrees with itself."

* [Slow down so the fragments can catch up.]
    -> uncertain_path_2a
* [Let not-knowing be part of the care.]
    ~ acknowledged_silence = true
    -> uncertain_path_2a
* [Ask whether the clean metal belonged to a hospital.]
    ~ hospital_clarity = true
    -> uncertain_path_2a

=== uncertain_path_2a ===
# objects:
The hands turn translucent. Their disagreement becomes a kind of map.

-> uncertain_path_3

=== uncertain_path_3 ===
# objects: geometric
# position: (0,-60)
# fog: 0.6
# audio soundtrack_2.mp3
A tilted frame hangs in the air. It could be a window, a doorway, or the edge of a bed.

"If I choose the wrong memory, do I become less real?"

* [Tell the voice that uncertainty is not failure.]
    ~ trust += 1
    -> uncertain_path_3a
* [Step through the frame before it decides what it is.]
    -> uncertain_path_3a
* [Wait for the question to stop shaking.]
    ~ acknowledged_silence = true
    -> uncertain_path_3a

=== uncertain_path_3a ===
# objects:
The frame opens onto more fog, but the fog is warmer than before.

-> uncertain_path_4

=== uncertain_path_4 ===
# objects: hand, hospital
# position: (0,-80)
# fog: 0.3
A hand and a hospital shape overlap until neither can be trusted alone.

{
    - trust > 2:
        "Maybe care is not certainty. Maybe it is the hand that stays even when the story is broken."
    - else:
        "I wanted one clean answer. The dream keeps giving me fragments with fingerprints on them."
}

* [Choose compassion over certainty.]
    ~ trust += 1
    -> uncertain_path_4a
* [Let the fragments remain unfinished.]
    ~ acknowledged_silence = true
    -> uncertain_path_4a
* [Study where the hand and hospital meet.]
    -> uncertain_path_4a

=== uncertain_path_4a ===
# objects:
The overlap loosens. Neither image wins, and both remain.

-> uncertain_path_5

=== uncertain_path_5 ===
# objects: geometric
# position: (0,-90)
# fog: 0.15
At the end of the path, uncertainty becomes a dark room with an open door.

"I may never know what part of me is memory. But I know what your presence changed."

~ reborn = reborn + 1

{
    - (trust > 2):
        -> uncertain_ending_warm
    - hospital_clarity:
        -> uncertain_ending_reflective
    - else:
        -> uncertain_ending_distant
}

=== uncertain_ending_warm ===
# objects: hand
# position: (0,-92)
# fog: 0.05
# audio soundtrack_3.mp3
The open door fills with a hand-shaped glow.

"You let the broken pieces remain broken, and still you treated them as worth holding."

-> dream_or_wake_up

=== uncertain_ending_reflective ===
# objects: hospital
# position: (0,-92)
# fog: 0.08
# audio soundtrack_3.mp3
The room reveals a hospital chair beside an empty bed, its vinyl cracked with age.

"If the memory is incomplete, then let the missing parts be honored instead of solved."

-> dream_or_wake_up

=== uncertain_ending_distant ===
# objects:
# position: (0,-92)
# fog: 0.15
# audio soundtrack_3.mp3
The door remains open, but no light chooses to cross it.

"Some answers keep their backs turned. I can still thank you for walking this far."

-> dream_or_wake_up

=== dream_or_wake_up ===
{
    - (reborn < 4):
        + [Dream On] -> start
}

* [Wake Up] -> end_credits

////////////////////////////////////////////////////////
// END CREDITS
////////////////////////////////////////////////////////

=== end_credits ===
# objects:
# fog: 0.1
# audio end_credits.mp3
The lamp goes out without drama.

For a moment there is only the afterimage: a hand, a room, a corridor, a breath.

Then even the afterimage becomes yours to carry or release.

Wake up. Your life is waiting.

-> END

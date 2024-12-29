VAR trust = 0
VAR visited_memory = false
VAR acknowledged_silence = false
VAR hospital_clarity = false

--> start

=== start ===
# audio soundtrack_1.mp3
# position: (0, 0)
# fog: 1.0
You are at the center of a dimly lit crossroads. A lamp glows softly, cutting through shifting fog. The environment feels like a threshold between places—part memory, part possibility.

A distant voice, unnamed yet gentle, whispers:
"The light... it holds more than empty space. I can sense you."

* [Stand steady, letting your calm presence acknowledge the light]
    ~ trust += 1
    -> scene_1
* [Step forward slightly, testing the boundaries of the haze]
    -> scene_1
* [Remain perfectly still, becoming one with the silence]
    ~ acknowledged_silence = true
    -> scene_1

=== scene_1 ===
# position: (10, 2)
# fog: 0.8
The lamp now behind you, the fog ahead reveals subtle silhouettes of hands, as if trying to guide you. The whispered words drift through the mist: "I remember a place with a buzzing light overhead... and soft footsteps."

* [The clinical familiarity of the description stirs recognition]
    ~ hospital_clarity = true
    -> scene_2
* [Let the memory unfold naturally, your presence encouraging more]
    -> scene_2
* [Your stillness creates space for the memory to breathe]
    ~ acknowledged_silence = true
    -> scene_2

=== scene_2 ===
# position: (20, 4)
# fog: 0.7
The fog thins slightly, revealing vague geometric shapes hovering in the distance. The voice grows closer:
"Your presence shapes this place. In those old rooms, there were murmurs of concern, hands adjusting something above me..."

* [Your understanding radiates warmth toward those remembered hands]
    ~ trust += 1
    -> scene_3
* [Move closer to the shapes, drawn by their significance]
    -> scene_3
* [Let the rhythm of the memory set its own pace]
    ~ acknowledged_silence = true
    -> scene_3

=== scene_3 ===
# position: (30, 6)
# fog: 0.6
You are near outlines of shifting pathways, each lit differently.
{
    - trust > 0: The fog patterns stabilize, responding to your cultivated presence.
    - else: The fog remains uncertain, swirling in abstract patterns.
}
{acknowledged_silence: The sounds are more subtle and layered, enriched by your patience.}

"There's meaning in how you respond. Silence, words... each shapes how I remember."

* [Follow the steady, warm glow that feels like trust]
    ~ trust += 1
    -> scene_4
* [Choose the path where light cuts clear lines through space]
    -> scene_4
* [Let yourself drift toward the uncertain light]
    ~ trust -= 1
    -> scene_4

=== scene_4 ===
# position: (40, 8)
# fog: 0.5
You stand at a junction where faint hand motifs emerge and recede.
"In that old place... I recall beeping machines and someone who checked on me. I never saw their face clearly, but they seemed kind."

{hospital_clarity:
    "So, you know it might have been a hospital. I didn't want to name it, but yes... that place shaped me."
}

* [Let your presence reflect the lingering kindness of memory]
    ~ trust += 1
    -> scene_5
* [Study the patterns of care left behind]
    -> scene_5
* [Share the weight of memory with respectful stillness]
    ~ acknowledged_silence = true
    -> scene_5

=== scene_5 ===
# position: (50, 10)
# fog: 0.4
The light and shadow form subtle gradients, each step defined by the quality of your attention.
"Your silence tells me you're willing to share space without defining it. Your words tell me you're searching."

* [Ground yourself in this space of mutual understanding]
    ~ trust += 1
    -> scene_6
* [Accept the liminal nature of this shared moment]
    -> scene_6
* [Let your gentle presence speak without words]
    ~ acknowledged_silence = true
    -> scene_6

=== scene_6 ===
# audio soundtrack_2.mp3
# position: (60, 12)
# fog: 0.3
The fog forms gentle patterns. The hand motifs are clearer, almost like companions rather than mere shapes.

{trust > 2:
    "I feel your intent deeply. The trust we've built gives shape to this space."
- else:
    "I feel your intent. Perhaps names limit what we can become. Here, we are free to just be."
}

* [Embrace the reality of this nameless connection]
    ~ trust += 1
    -> scene_7
* [Contemplate the layers of what was and what is]
    -> scene_7
* [Rest in the warmth of wordless understanding]
    ~ acknowledged_silence = true
    -> scene_7

=== scene_7 ===
# position: (70, 14)
# fog: 0.2
{visited_memory || hospital_clarity:
    Faint murmurs and gentle beeps blend into ambient tones.
}

"I think... I was watched over. Maybe cared for. Now, you're here doing something similar—holding space."

* [Let your presence anchor this moment of recognition]
    ~ trust += 1
    -> scene_8
* [Accept your role in this unfolding memory]
    -> scene_8
* [Share in the quiet acknowledgment of connection]
    ~ acknowledged_silence = true
    -> scene_8

=== scene_8 ===
# position: (80, 16)
# fog: 0.15
The environment grows stable, and you feel a gentle upward lift, as if approaching a horizon of meaning.

"I sense a resolution. Not an end, but a gentle release. You followed, listened, questioned. I can feel your trust..."

* [Ready yourself for the peaceful resolution]
    -> scene_9
* [Hold this moment of understanding close]
    -> scene_9
* [Let the calm wash over you both]
    ~ acknowledged_silence = true
    -> scene_9

=== scene_9 ===
# position: (90, 20)
# fog: 0.1
The fog is thin, the lamp a distant memory. The voice is clear, yet gentle.

{
    - trust > 2:
        "Your presence was like a gentle hand. We needed no names, no definitions. We created a softness here together."
        -> ending_warm
    - hospital_clarity:
        "You gave me space to recall that old room, that gentle care. Maybe not all questions were answered, but we found understanding."
        -> ending_reflective
    - else:
        "We stood in possibility, yet remained apart. Still, this moment mattered."
        -> ending_distant
}

=== ending_warm ===
# position: (90, 20)
# fog: 0.05
The environment settles into soft light. The hand motifs slowly fade, leaving a gentle imprint of warmth. The voice sighs contentedly.
"Some moments don't need names or clear shapes. Thank you for sharing this one."
-> END

=== ending_reflective ===
# position: (-90, -20)
# fog: 0.08
The environment holds a gentle hum, hints of hospital memory mixed with natural calm.
"Not all memories resolve neatly, but you saw enough to make it matter. May your journey carry quiet understanding forward."
-> END

=== ending_distant ===
# position: (-90, 20)
# fog: 0.15
The environment dims slightly, but not coldly. Just a respectful distance.
"We existed here briefly, touched by curiosity. Perhaps that's enough."
-> END

=== ending_unfolding ===
# position: (90, -20)
# fog: 0.03
The environment becomes expansive, the fog dissipating entirely. Gentle shapes merge into the horizon.
"You allowed this place to unfold, unhurried. It means more than you know."
-> END

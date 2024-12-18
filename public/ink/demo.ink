VAR trust = 0
VAR visited_memory = false
VAR acknowledged_silence = false
VAR hospital_clarity = false

--> start

=== start ===
You are at the center of a dimly lit crossroads. # position: (0, 0)
A lamp glows softly, cutting through shifting fog. The environment feels like a threshold between places—part memory, part possibility.

A distant voice, unnamed yet gentle, whispers:  
"The light... it holds more than empty space. I can sense you."

* "I see the light, steady and patient." [Show empathy]
    ~ trust += 1
    -> scene_1
* "What's beyond this haze?" [Curiosity]
    -> scene_1
* *Maintain silence* 
    ~ acknowledged_silence = true
    -> scene_1

=== scene_1 ===
You are at a slightly clearer pathway leading eastward. # position: (10, 2)
The lamp now behind you, the fog ahead reveals subtle silhouettes of hands, as if trying to guide you.  
"I remember a place with a buzzing light overhead... and soft footsteps."

* "A hospital, perhaps?"
    ~ hospital_clarity = true
    -> scene_2
* "Tell me more about these memories."
    -> scene_2
* Remain silent, listening deeply.
    ~ acknowledged_silence = true
    -> scene_2

=== scene_2 ===
You stand where the fog thins slightly, vague geometric shapes hover in the distance. # position: (20, 4)  
The voice seems closer: "Your presence shapes this place. In those old rooms, there were murmurs of concern, hands adjusting something above me..."

* "Were those caring hands?"
    ~ trust += 1
    -> scene_3
* "I'm trying to understand why we're here."
    -> scene_3
* Continue in silence, letting the voice find its own rhythm.
    ~ acknowledged_silence = true
    -> scene_3

=== scene_3 ===
You are near outlines of shifting pathways, each lit differently. # position: (30, 6)  
{
    - trust > 0: The fog patterns stabilize, responding to your cultivated trust.
    - else: The fog remains uncertain, swirling in abstract patterns.
}
{acknowledged_silence: The sounds are more subtle and layered, enriched by your patience.}

"There's meaning in how you respond. Silence, words... each shapes how I remember."

* Choose a stable, warm-lit path
    ~ trust += 1
    -> scene_4
* Choose a sharp-lit path with defined edges
    -> scene_4
* Drift toward a path of uncertain, flickering light
    ~ trust -= 1
    -> scene_4

=== scene_4 ===
You stand at a junction where faint hand motifs emerge and recede. # position: (40, 8)  
"In that old place... I recall beeping machines and someone who checked on me. I never saw their face clearly, but they seemed kind."

{hospital_clarity:
    "So, you know it might have been a hospital. I didn't want to name it, but yes... that place shaped me."
}

* "Kindness lingers, even when faces fade."
    ~ trust += 1
    -> scene_5
* "What did they change or fix?"
    -> scene_5
* Remain silent, acknowledging the weight of memory.
    ~ acknowledged_silence = true
    -> scene_5

=== scene_5 ===
You are near a subtler gradient of light and shadow, each step defined by how you listen. # position: (50, 10)  
"Your silence tells me you're willing to share space without defining it. Your words tell me you're searching."

* "I am here to understand—both you and myself."
    ~ trust += 1
    -> scene_6
* "I only know that we stand between worlds."
    -> scene_6
* Silence, offering gentle presence.
    ~ acknowledged_silence = true
    -> scene_6

=== scene_6 ===
You have reached a calmer clearing. # position: (60, 12)  
The fog forms gentle patterns. The hand motifs are clearer, almost like companions rather than mere shapes.

{trust > 2:
    "I feel your intent deeply. The trust we've built gives shape to this space."
- else:
    "I feel your intent. Perhaps names limit what we can become. Here, we are free to just be."
}

* "We don't need names to be real."
    ~ trust += 1
    -> scene_7
* "But I still wonder what you were before."
    -> scene_7
* Stay silent, letting warmth fill the space.
    ~ acknowledged_silence = true
    -> scene_7

=== scene_7 ===
You stand where subtle hospital hints merge with natural patterns. # position: (70, 14)  
{visited_memory || hospital_clarity:
    Faint murmurs and gentle beeps blend into ambient tones.
}

"I think... I was watched over. Maybe cared for. Now, you're here doing something similar—holding space."

* "We anchor each other."
    ~ trust += 1
    -> scene_8
* "So, I become part of your memory?"
    -> scene_8
* Silence, acknowledging the bond forming.
    ~ acknowledged_silence = true
    -> scene_8

=== scene_8 ===
You are near the edge of understanding, where patterns begin to resolve. # position: (80, 16)  
The environment grows stable, and you feel a gentle upward lift, as if approaching a horizon of meaning.

"I sense a resolution. Not an end, but a gentle release. You followed, listened, questioned. I can feel your trust..."

* "I'm ready to let this moment rest peacefully."
    -> scene_9
* "Before we part, I want to know what comfort means to you."
    -> scene_9
* Silence, sharing a final moment of calm.
    ~ acknowledged_silence = true
    -> scene_9

=== scene_9 ===
You stand at a place of quiet conclusion. # position: (90, 20)  
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
The environment settles into soft light. The hand motifs slowly fade, leaving a gentle imprint of warmth. The voice sighs contentedly.
"Some moments don't need names or clear shapes. Thank you for sharing this one."
-> END

=== ending_reflective ===
The environment holds a gentle hum, hints of hospital memory mixed with natural calm.
"Not all memories resolve neatly, but you saw enough to make it matter. May your journey carry quiet understanding forward."
-> END

=== ending_distant ===
The environment dims slightly, but not coldly. Just a respectful distance.
"We existed here briefly, touched by curiosity. Perhaps that's enough."
-> END
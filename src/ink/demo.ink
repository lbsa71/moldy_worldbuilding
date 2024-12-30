VAR trust = 0
VAR visited_memory = false
VAR acknowledged_silence = false
VAR hospital_clarity = false
VAR reborn = false

-> start

=== start ===
# audio soundtrack_1.mp3
# position: (0, 0)
# fog: 1.0

{
    - reborn:
        You find yourself returning to a dimly lit crossroads, the soft glow of a single lamp familiar yet renewed.
    - else:
        You stand at a dimly lit crossroads, where a single lamp glows softly through shifting fog.
}

A distant, unnamed voice whispers, gentle but present:
"The light... it holds more than empty space. I can sense you."

* [A subtle glow on your right calls to you, like a gentle invitation...]
    -> trust_path_1
* [Something stirs in the haze beyond, carrying faint echoes of memory...]
    -> memory_path_1
* [An enveloping hush extends to the left, inviting a deeper silence...]
    -> silence_path_1
* [A soft pull below tugs at your curiosity, uncertain but compelling...]
    -> uncertain_path_1

////////////////////////////////////////////////////////
// TRUST PATH: moves from (0,0) to (90,0)
////////////////////////////////////////////////////////

=== trust_path_1 ===
# position: (20,0)
# fog: 0.95
You shift toward the faint glow to your right. The voice follows, reflecting your resolute presence:
"I remember a place with a buzzing light overhead... and soft footsteps. Everything else shifts, but this... this remains."

* [Stand steady, letting your calm presence acknowledge the light]
    ~ trust += 1
    -> trust_path_2
* [Step forward, testing the boundaries of the haze]
    -> trust_path_2
* [Remain still momentarily, becoming one with the silence]
    ~ acknowledged_silence = true
    -> trust_path_2

=== trust_path_2 ===
# position: (40,0)
# fog: 0.8
The path continues in a gentle line, with silhouettes of hands emerging in the fog.  
The whisper returns:
"In those old rooms, there were murmurs of concern... hands adjusting something above me."

* [Your understanding radiates warmth toward those remembered hands]
    ~ trust += 1
    -> trust_path_3
* [Encourage the memory to unfold naturally]
    -> trust_path_3
* [Your stillness creates space for the memory to breathe]
    ~ acknowledged_silence = true
    -> trust_path_3

=== trust_path_3 ===
# position: (60,0)
# fog: 0.6
The fog patterns stabilize at your approach:
"There's meaning in how you respond. Silence, words... each shapes how I remember."

* [Follow the steady, warm glow that feels like trust]
    ~ trust += 1
    -> trust_path_4
* [Choose the path where light cuts clear lines through space]
    -> trust_path_4
* [Let yourself drift toward the uncertain, but remain on this track]
    ~ trust -= 1
    -> trust_path_4

=== trust_path_4 ===
# position: (80,0)
# fog: 0.3
# audio soundtrack_2.mp3
As you near an unseen horizon, the voice clarifies:
"I think... I was watched over. Maybe cared for. Now, you're here doing something similar—holding space."

{
    - trust > 2:
        "I feel your intent deeply. The trust we've built gives shape to this space."
    - else:
        "I sense your intent. Perhaps names limit what we can become. Here, we are free to just be."
}

* [Embrace the reality of this nameless connection]
    ~ trust += 1
    -> trust_path_5
* [Contemplate the layers of what was and what is]
    -> trust_path_5
* [Rest in the warmth of wordless understanding]
    ~ acknowledged_silence = true
    -> trust_path_5

=== trust_path_5 ===
# position: (90,0)
# fog: 0.15
A gentle clearing opens in the fog. The lamp is far behind, though its glow lingers in memory.
"I sense a resolution. Not an end, but a gentle release. You followed, listened, questioned. I can feel your trust..."

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

////////////////////////////////////////////////////////
// MEMORY PATH: moves from (0,0) to (0,90)
////////////////////////////////////////////////////////

=== memory_path_1 ===
# position: (0,20)
# fog: 0.95
You step forward, drawn by a stirring in the haze that seems to carry faint echoes of distant recollections.  
The voice softly continues:
"The light... it stays. But everything else shifts... I recall a buzzing overhead, and soft footsteps."

* [The clinical familiarity stirs recognition: "Was it a hospital?"]
    ~ hospital_clarity = true
    -> memory_path_2
* [Let the memory unfold, your presence encouraging more]
    -> memory_path_2
* [Your stillness invites deeper recollection]
    ~ acknowledged_silence = true
    -> memory_path_2

=== memory_path_2 ===
# position: (0,40)
# fog: 0.8
Vague geometric shapes hover above, reminiscent of rails or distant doorways.  
"In that old place, I recall beeping machines. Someone checked on me... I never saw their face, but they seemed kind."

* [Acknowledge how these shapes might be hospital elements]
    ~ hospital_clarity = true
    -> memory_path_3
* [Draw closer to the geometry, seeking more details]
    -> memory_path_3
* [Encourage the memory gently with your silent attention]
    ~ acknowledged_silence = true
    -> memory_path_3

=== memory_path_3 ===
# position: (0,60)
# fog: 0.6
The fog thins, revealing the shifting outlines of reaching hands.  
"There's meaning in how you respond. Silence, words... each shapes how I remember."

* [Steady your presence, radiating warmth toward the memory]
    ~ trust += 1
    -> memory_path_4
* [Move closer to the shapes, drawn by their significance]
    -> memory_path_4
* [Let the rhythm of the memory set its own pace]
    ~ acknowledged_silence = true
    -> memory_path_4

=== memory_path_4 ===
# position: (0,80)
# fog: 0.3
# audio soundtrack_2.mp3
Hints of medical equipment echo through the space, dreamlike. The voice grows closer:
"I think... someone was caring for me. Maybe you’re doing something similar now."

{
    - trust > 2:
        "I feel your intent deeply. The trust we've built gives shape to this space."
    - else:
        "Perhaps names limit what we can become, but your presence shapes these memories."
}

* [Let your presence anchor this recollection]
    ~ trust += 1
    -> memory_path_5
* [Quietly share the weight of memory]
    ~ acknowledged_silence = true
    -> memory_path_5
* [Observe the hospital-like shapes intently]
    -> memory_path_5

=== memory_path_5 ===
# position: (0,90)
# fog: 0.15
A softly-lit point opens in the haze, where clinical geometry and gentle calm mingle.
"I sense a resolution. Not an end, but a gentle release. You followed, listened, questioned. I can feel your trust..."

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

////////////////////////////////////////////////////////
// SILENCE PATH: moves from (0,0) to (-90,0)
////////////////////////////////////////////////////////

=== silence_path_1 ===
# position: (-20,0)
# fog: 0.95
You drift left, where an enveloping hush seems to deepen. The voice seems intrigued by your quiet approach:
"I can feel your presence even if you don't speak. There's a gentle focus to silence..."

* [Continue in silence, letting the environment respond]
    ~ acknowledged_silence = true
    -> silence_path_2
* [Step on quietly, encouraging the voice to reveal more]
    -> silence_path_2
* ["Tell me about that buzzing light you mentioned?"]
    ~ trust += 1
    -> silence_path_2

=== silence_path_2 ===
# position: (-40,0)
# fog: 0.8
Fog swirls in layers, as though listening with you. The voice returns:
"In that old place... there were hands adjusting something, a gentle hum. Maybe it was a hospital, maybe just a memory of care."

* [Let the memory surface in stillness]
    ~ acknowledged_silence = true
    -> silence_path_3
* [Reach out quietly, offering warmth]
    ~ trust += 1
    -> silence_path_3
* [Ask about who was adjusting the equipment]
    ~ hospital_clarity = true
    -> silence_path_3

=== silence_path_3 ===
# position: (-60,0)
# fog: 0.6
The environment shifts in subtle, rhythmic patterns:
"Sometimes words only disturb the understanding. There's meaning in how you simply remain."

* [Embrace the quiet, focusing on the environment’s changes]
    ~ acknowledged_silence = true
    -> silence_path_4
* [Offer a small reassurance that you are present]
    ~ trust += 1
    -> silence_path_4
* [Keep listening for hospital clues]
    -> silence_path_4

=== silence_path_4 ===
# position: (-80,0)
# fog: 0.3
# audio soundtrack_2.mp3
A faint glow still hints behind you; the voice grows calm:
"Your silence tells me you're willing to share space without defining it. Your words tell me you're searching."

{
    - trust > 2:
        "I feel your intent deeply. The trust we've built gives shape to this space."
    - else:
        "Perhaps names limit what we can become. Here, we are free to just be."
}

* [Rest in the warmth of wordless understanding]
    ~ acknowledged_silence = true
    -> silence_path_5
* [Embrace the intangible connection forming here]
    ~ trust += 1
    -> silence_path_5
* [Remain quietly observant, seeing how the environment responds]
    -> silence_path_5

=== silence_path_5 ===
# position: (-90,0)
# fog: 0.15
You arrive at a serene open space, the fog thinning to reveal gentle shapes.  
"I sense a resolution. Not an end, but a gentle release. You followed, listened, questioned. I can feel your trust..."

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

////////////////////////////////////////////////////////
// UNCERTAINTY PATH: moves from (0,0) to (0,-90)
////////////////////////////////////////////////////////

=== uncertain_path_1 ===
# position: (0,-20)
# fog: 0.95
You feel a subtle pull downward, drawing you into denser fog. The voice wavers, curious about your choice:
"The light remains behind us. But let’s see what else emerges... Everything else shifts."

* [Let yourself be guided by this uncertain pull, curious yet cautious]
    -> uncertain_path_2
* [Move carefully, letting the environment show its secrets]
    -> uncertain_path_2
* [Say nothing, simply continuing]
    ~ acknowledged_silence = true
    -> uncertain_path_2

=== uncertain_path_2 ===
# position: (0,-40)
# fog: 0.8
Shadows of reaching hands flicker through the haze:
"There were footsteps. Adjustments. Maybe a hospital, maybe not. It's all uncertain, yet meaningful."

* [Slow your movements, letting the environment settle]
    -> uncertain_path_3
* [Embrace the hush of not knowing]
    ~ acknowledged_silence = true
    -> uncertain_path_3
* [Ask softly if it was a hospital]
    ~ hospital_clarity = true
    -> uncertain_path_3

=== uncertain_path_3 ===
# position: (0,-60)
# fog: 0.6
# audio soundtrack_2.mp3
The voice draws nearer, as though gathering courage in your presence:
"There's meaning in how you respond. Silence, words... each shapes how I remember."

* [Choose to let the environment lead, uncertain but present]
    -> uncertain_path_4
* [Whisper a gentle reassurance]
    ~ trust += 1
    -> uncertain_path_4
* [Observe quietly, letting the memory form on its own]
    ~ acknowledged_silence = true
    -> uncertain_path_4

=== uncertain_path_4 ===
# position: (0,-80)
# fog: 0.3
The surrounding shapes remain indistinct, yet a subtle warmth begins to form:
"I think... I was watched over. Maybe cared for. Now, you're here, doing something similar—holding space."

{
    - trust > 2:
        "I feel your intent deeply. The trust we've built gives shape to this space."
    - else:
        "I sense your intent. Perhaps names limit what we can become."
}

* [Encourage the unseen shapes to emerge]
    -> uncertain_path_5
* [Reflect quietly on the mention of care]
    ~ acknowledged_silence = true
    -> uncertain_path_5
* [Acknowledge that not all is meant to be clear]
    -> uncertain_path_5

=== uncertain_path_5 ===
# position: (0,-90)
# fog: 0.15
The fog here is thin, though the lamp is far behind. The voice is calm, almost resolute:
"I sense a resolution. Not an end, but a gentle release. You followed, listened, questioned. I can feel your trust..."

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

////////////////////////////////////////////////////////
// ENDINGS
////////////////////////////////////////////////////////

=== ending_warm ===
# position: (90, 10)
# fog: 0.05
# audio soundtrack_3.mp3
The environment settles into soft light. The hand motifs slowly fade, leaving a gentle imprint of warmth. The voice sighs contentedly.
"Some moments don't need names or clear shapes. Thank you for sharing this one."

* [Dream]
    ~ reborn = true
    -> start
* [Wake Up]
    -> end_credits

=== ending_reflective ===
# position: (0, 100)
# fog: 0.08
# audio soundtrack_3.mp3
The environment holds a gentle hum, hints of hospital memory mixed with natural calm.
"Not all memories resolve neatly, but you saw enough to make it matter. May your journey carry quiet understanding forward."

* [Dream]
    ~ reborn = true
    -> start
* [Wake Up]
    -> end_credits

=== ending_distant ===
# position: (-90, 10)
# fog: 0.15
# audio soundtrack_3.mp3
The environment dims slightly, but not coldly. Just a respectful distance.
"We existed here briefly, touched by curiosity. Perhaps that's enough."

* [Dream]
    ~ reborn = true
    -> start
* [Wake Up]
    -> end_credits

=== ending_unfolding ===
# position: (0, -100)
# fog: 0.03
# audio soundtrack_3.mp3
The environment becomes expansive, the fog dissipating entirely. Gentle shapes merge into the horizon.
"You allowed this place to unfold, unhurried. It means more than you know."

* [Dream]
    ~ reborn = true
    -> start
* [Wake Up]
    -> end_credits

=== end_credits ===
# fog: 0.1
# audio end_credits.mp3
"The journey is not the answer, nor is the destination. It is the act of seeking that shapes who we are.
Perhaps you are waking from a dream, or perhaps you are only now beginning to dream.
Who you are—man, butterfly, or something beyond labels—need not be decided. What matters is that you live.
To see, to feel, to wonder: this is the essence of your being.

Wake up. Your life is waiting."
-> END

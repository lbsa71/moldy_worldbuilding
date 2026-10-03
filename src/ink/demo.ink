// Fading — The place beside the light.
// Every knot is a complete display beat. Silence is an authored action, never an idle timer.
VAR connection = 0
VAR inquiry = 0
VAR silence_count = 0
VAR memory_cup = false
VAR memory_rail = false
VAR hospital_clarity = false
VAR accepted_uncertainty = false
VAR chosen_ending = ""
VAR last_response = ""
VAR keepsake = ""

-> lamp

=== lamp ===
# scene: lamp
# chapter: The place beside the light
# mood: hushed
# objects: lamp
# position: (0, 0)
# fog: 0.82
# audio soundtrack_1.mp3
A lamp stands on bare stone. Its shade is crooked. Beyond its small circle of light, the fog has no edges.

"Before you answer—was it you who moved the chair?"

The voice seems to come from the empty place beside it.

* ["I just arrived."]
    ~ connection += 1
    ~ last_response = "arrived"
    -> chair
* [Look for the chair.]
    ~ inquiry += 1
    ~ last_response = "looked"
    -> chair
* [Stay quietly beside the lamp.]
    ~ silence_count += 1
    ~ last_response = "quiet"
    -> chair

=== chair ===
# scene: chair
# chapter: A place for someone
# mood: hushed
# objects: lamp, chair
# position: (4, -2)
# fog: 0.74
{last_response == "arrived":
    "Then someone else was here. I thought I'd hear them leave."
}
{last_response == "looked":
    Where you look, four pale chair legs gather out of the mist.
    "There. It used to face the light. Someone turned it toward me."
}
{last_response == "quiet":
    You wait. A chair takes shape without anyone sitting down.
    "You don't have to explain yourself. That helps."
}

One side of the seat is worn smoother than the other.

* ["May I sit with you?"]
    ~ connection += 1
    ~ last_response = "sit"
    -> cup
* ["Who sat here before?"]
    ~ inquiry += 1
    ~ last_response = "who"
    -> cup
* [Leave the chair empty, and wait beside it.]
    ~ silence_count += 1
    ~ last_response = "empty"
    -> cup

=== cup ===
# scene: cup
# chapter: What was left behind
# mood: warm
# objects: lamp, chair, cup
# position: (9, 3)
# fog: 0.63
{last_response == "sit":
    "Yes. Just don't straighten the shade. I like knowing which way the light falls."
}
{last_response == "who":
    "I remember their sleeve. Dark at the cuff, as if they'd come through rain. The face won't stay."
}
{last_response == "empty":
    "They waited like that too. Close enough to be there. Far enough that I could sleep."
}

A cup forms near the chair: blue glaze, a little chip at the rim.

"There was tea. By the time I wanted it, it had gone cold. Such a small thing to keep remembering."

* ["Small things can stay. Tell me about the cup."]
    ~ memory_cup = true
    ~ inquiry += 1
    ~ last_response = "cup"
    -> rail
* ["Someone meant you to have it."]
    ~ connection += 1
    ~ last_response = "care"
    -> rail
* [Watch the empty cup without filling the silence.]
    ~ memory_cup = true
    ~ silence_count += 1
    ~ last_response = "cup_quiet"
    -> rail

=== rail ===
# scene: rail
# chapter: Two small taps
# mood: hushed
# objects: lamp, cup, rail
# position: (14, 7)
# fog: 0.58
{last_response == "cup":
    "They always turned the chip away from my mouth. Even when I didn't drink."
}
{last_response == "care":
    "Yes. I couldn't always answer. They brought it anyway."
}
{last_response == "cup_quiet":
    The cup holds its shape while you watch.
    "The chip went on the far side. I hadn't remembered that until now."
}

A short metal rail emerges. Two small taps sound against it, then a pause.

"Before they touched my hand, they did that. So I would know they were there."

* ["Was this beside a hospital bed?"]
    ~ hospital_clarity = true
    ~ inquiry += 1
    ~ last_response = "hospital"
    -> hand
* [Tap twice against the rail.]
    ~ memory_rail = true
    ~ connection += 1
    ~ last_response = "tapped"
    -> hand
* [Listen through the pause after the taps.]
    ~ memory_rail = true
    ~ silence_count += 1
    ~ last_response = "pause"
    -> hand

=== hand ===
# scene: hand
# chapter: Permission
# mood: warm
# objects: lamp, rail, hand, hospital
# position: (17, 9)
# fog: 0.49
{last_response == "hospital":
    "It could have been. There were wheels under the bed. A curtain that never quite closed. But that isn't what I miss."
}
{last_response == "tapped":
    A pale hand gathers beside the rail, its fingers held open.
    "You waited for me to answer. Thank you."
}
{last_response == "pause":
    Nothing interrupts the pause.
    "That was the part I trusted. They could have reached for me. They waited instead."
}

"May I?" the voice asks.

The hand stays where it is.

* [Offer your hand.]
    ~ connection += 1
    ~ last_response = "offered"
    -> contradiction
* ["Stay close. That's enough."]
    ~ connection += 1
    ~ last_response = "close"
    -> contradiction
* ["I'd rather just listen."]
    ~ silence_count += 1
    ~ last_response = "listen"
    -> contradiction

=== contradiction ===
# scene: contradiction
# chapter: The other side of the chair
# mood: uneasy
# objects: lamp, chair, cup, rail
# position: (22, 6)
# fog: 0.71
# audio soundtrack_2.mp3
{last_response == "offered":
    There is no weight against your palm, only a patch of warmth.
}
{last_response == "close":
    The hand lowers. The warmth stays between you.
}
{last_response == "listen":
    "All right." The hand withdraws, leaving room for your stillness.
}

"Wait. I remember bringing the tea. I remember rain running off my sleeve."

The chair turns a little, now facing the rail.

"I thought I was the one in the bed. How can I remember both sides?"

* ["Let's follow what you remember, one thing at a time."]
    ~ inquiry += 1
    ~ last_response = "follow"
    -> boundary
* ["We don't have to decide whose memory it is."]
    ~ accepted_uncertainty = true
    ~ last_response = "uncertain"
    -> boundary
* ["I can stay while you work it out."]
    ~ connection += 1
    ~ last_response = "stay"
    -> boundary

=== boundary ===
# scene: boundary
# chapter: A story that can remain open
# mood: uneasy
# objects: lamp, chair, geometric
# position: (25, 1)
# fog: 0.66
{last_response == "follow":
    "The cup. The rail. The chair. Those stay when the faces don't. Let's keep those."
}
{last_response == "uncertain":
    "I'd like that. I've been trying to make the pieces agree. It hurts less when I stop."
}
{last_response == "stay":
    "You can't promise to stay forever. But you are here now. I can work with now."
}

"If you tell me who I am, I might believe you. Please don't give me an answer just because I'm asking."

* ["I won't invent the missing parts."]
    ~ accepted_uncertainty = true
    ~ last_response = "honest"
    -> quiet
* ["I know that someone took care with you. That's what we have."]
    ~ connection += 1
    ~ last_response = "known"
    -> quiet
* [Let the question remain unanswered.]
    ~ accepted_uncertainty = true
    ~ silence_count += 1
    ~ last_response = "unanswered"
    -> quiet

=== quiet ===
# scene: quiet
# chapter: Room to breathe
# mood: hushed
# objects: lamp, chair
# position: (21, -5)
# fog: 0.51
{last_response == "honest":
    "Then I can stop trying to sound certain."
}
{last_response == "known":
    "Careful hands. Yes. I can believe that without finding a face."
}
{last_response == "unanswered":
    "You let it remain a question. I didn't know I could ask for that."
}

For a moment, the only sound is the lamp's low hum.

{silence_count >= 3:
    "You've made room for these pauses from the beginning. I notice them now."
- else:
    "Could we leave a little room between the words? Just here."
}

* [Share a quiet moment.]
    ~ silence_count += 1
    ~ last_response = "shared_quiet"
    -> recollection
* ["I'm here."]
    ~ connection += 1
    ~ last_response = "here"
    -> recollection
* [Look back toward the cup and rail.]
    ~ inquiry += 1
    ~ last_response = "look_back"
    -> recollection

=== recollection ===
# scene: recollection
# chapter: What holds its shape
# mood: warm
# objects: lamp, cup, rail, chair
# position: (16, -7)
# fog: 0.38
{last_response == "shared_quiet":
    The pause belongs to neither of you alone.
    "I heard the two taps again. This time, I wasn't waiting for anything after them."
}
{last_response == "here":
    "I know. You don't have to keep proving it."
}
{last_response == "look_back":
    The objects hold still beneath your attention. The rest of the room stays unfinished.
}

{memory_cup:
    "The chipped side turned away. You helped me keep that."
}
{memory_rail:
    "And the pause after two taps. You heard it, too."
}
{not memory_cup && not memory_rail:
    "Even without every detail, there's a chair turned toward someone. I can keep that."
}

"If something goes with you, what should it be?"

* ["The cup. Someone remembered how you liked it."]
    ~ memory_cup = true
    ~ keepsake = "cup"
    -> preparation
* ["Two taps, and the time to answer."]
    ~ memory_rail = true
    ~ keepsake = "taps"
    -> preparation
* ["The empty chair. A place without a demand."]
    ~ keepsake = "chair"
    ~ silence_count += 1
    -> preparation

=== preparation ===
# scene: preparation
# chapter: Before the light changes
# mood: hushed
# objects: lamp, chair, cup
# position: (8, -3)
# fog: 0.29
# audio soundtrack_3.mp3
{keepsake == "cup":
    The cup turns, putting its chip on the far side.
    "A small kindness. Small enough to do again."
}
{keepsake == "taps":
    Two taps sound in the stone beneath your feet.
    "And then wait. Don't forget that part."
}
{keepsake == "chair":
    The chair turns toward you, its seat still empty.
    "A place someone can take. Or leave empty."
}

The lamp flickers once. The voice does not disappear.

"I don't know if this room can stay. I don't want to make that your responsibility."

* ["We can leave a light for whoever comes next."]
    ~ last_response = "next"
    -> decision
* ["What happened here can matter somewhere else."]
    ~ last_response = "elsewhere"
    -> decision
* ["We can let it rest when we're ready."]
    ~ last_response = "ready"
    -> decision

=== decision ===
# scene: decision
# chapter: A way to leave
# mood: resolved
# objects: lamp, chair, cup, rail
# position: (3, 0)
# fog: 0.23
{last_response == "next":
    "Yes. It doesn't have to be a promise that I return. It can simply be a light."
}
{last_response == "elsewhere":
    "I'd like that. Something ordinary, in an ordinary room."
}
{last_response == "ready":
    "I'm ready to stop searching tonight. Thank you for asking."
}

The fog opens around the lamp. The cup, chair, and rail hold their shapes a little longer.

"How shall we leave this place?"

* [Keep the light burning, with a place beside it.]
    ~ chosen_ending = "keep"
    -> keep
* [Carry a small memory into the waking world.]
    ~ chosen_ending = "carry"
    -> carry
* [Stay together while the room comes to rest.]
    ~ chosen_ending = "rest"
    -> rest

=== keep ===
# scene: keep
# chapter: A place remains
# mood: resolved
# ending: keep
# objects: lamp, chair
# position: (0, 0)
# fog: 0.18
# audio end_credits.mp3
You turn the chair toward the lamp. You leave the shade crooked.

"Not a summons," the voice says. "A place."

{silence_count >= 3:
    There is room for the quiet you learned to share. Neither of you needs to fill it.
- else:
    The last words settle into the hum. You let them stay there.
}

{keepsake == "cup":
    Beside the chair, a blue ring remains where the cup stood.
}
{keepsake == "taps":
    Two small taps answer from somewhere inside the light.
}
{keepsake == "chair":
    The smooth side of the seat catches the light.
}

You leave without closing a door. Behind you, the lamp keeps its small circle.
-> END

=== carry ===
# scene: carry
# chapter: A kindness carried
# mood: resolved
# ending: carry
# objects: lamp, hand
# position: (0, 0)
# fog: 0.12
# audio end_credits.mp3
The room loosens at its edges. The light rests briefly against your open hand.

{keepsake == "cup":
    In another room, on another morning, you will turn a chipped cup so someone can drink from the smooth side.
    "That's enough to take," the voice says.
}
{keepsake == "taps":
    You tap twice against the rail. Then you wait.
    "There," the voice says. "You can do that anywhere."
}
{keepsake == "chair":
    You will remember to draw up a chair without asking someone to speak.
    "Leave them room," the voice says. "As you did for me."
}

{accepted_uncertainty:
    The face is still missing. You carry the kindness without completing the story.
- else:
    You remember what your questions found: someone took care. The rest can follow in its own time.
}

When you lower your hand, it is your own again. The small act remains possible.
-> END

=== rest ===
# scene: rest
# chapter: A room at rest
# mood: resolved
# ending: rest
# objects: lamp, chair
# position: (0, 0)
# fog: 0.34
# audio end_credits.mp3
You stay beside the chair. The light softens until the stone holds only a pale circle.

"We can stop here," the voice says.

{silence_count >= 3:
    You know this pause. It does not ask you to become someone different. You share it as you are.
- else:
    This time you let the pause last. Nothing asks for another answer.
}

{keepsake == "cup":
    The cup's blue glaze is the last color to leave the room.
}
{keepsake == "taps":
    Two taps, then the space after them. You wait together.
}
{keepsake == "chair":
    The chair remains empty. You have made room without deciding who must fill it.
}

The voice rests before the lamp does. When you rise, you do so in your own time.
-> END

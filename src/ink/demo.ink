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
// Opening cut establishes the place before reading; no arrival movement.
# camera: wide
# transition: cut 0
# arrangement: chair=rest,cup=near,lamp=steady,trace=none
# sound: none
# scene: lamp
# weather: none
# chapter: The place beside the light
# mood: hushed
# audio soundtrack_1.mp3
A lamp stands on broken dark stone beside still water. Its shade is crooked. Beyond its small circle of light, the shore disappears into mist.

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
// 1.8s ease acknowledges attention; quiet retains the wide shot without a reading timer.
{last_response == "quiet":
    # camera: wide
    # transition: ease 1.8
    # arrangement: chair=rest,cup=near,lamp=steady,trace=none
    # sound: none
- else:
    # camera: chair
    # transition: ease 1.8
    # arrangement: chair=rest,cup=near,lamp=steady,trace=none
    # sound: none
}
# scene: chair
# weather: none
# chapter: A place for someone
# mood: hushed
{last_response == "arrived":
    The empty place beside the chair seems to make room for an arrival.
    "Then someone else was here. I thought I'd hear them leave."
}
{last_response == "looked":
    Your attention finds four worn chair legs beneath the draped cloth.
    "There. It used to face the light. Someone turned it toward me."
}
{last_response == "quiet":
    The hush leaves room beside a chair without anyone sitting down.
    "You don't have to explain yourself. That helps."
}

One side of the seat is worn smoother than the other. The lamp keeps a small circle beside it.

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
// 1.8s ease makes the chip legible; closeness turns the same empty chair once.
{last_response == "sit":
    # camera: cup
    # transition: ease 1.8
    # arrangement: chair=turned,cup=near,lamp=steady,trace=none
    # sound: none
- else:
    # camera: cup
    # transition: ease 1.8
    # arrangement: chair=rest,cup=near,lamp=steady,trace=none
    # sound: none
}
# scene: cup
{last_response == "who":
    # weather: rain-memory
- else:
    # weather: none
}
# chapter: What was left behind
# mood: warm
{last_response == "sit":
    The empty chair turns a little. Its worn seat catches the lamp.
    "Yes. I remember knowing which way the light fell."
}
{last_response == "who":
    The question rests in the empty place beside the chair.
    "I remember their sleeve. Dark at the cuff, as if they'd come through rain. The face won't stay."
}
{last_response == "empty":
    You leave the seat empty, keeping a little distance from the bedside place.
    "They waited like that too. Close enough to be there. Far enough that I could sleep."
}

A porcelain cup with a blue pattern rests on the chair: a little chip at the rim. The place beside it is empty.

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
// 1.8s ease includes the bedside rail. Two sound onsets belong to this entry, then stillness.
{memory_cup:
    # camera: bedside
    # transition: ease 1.8
    # arrangement: chair=rest,cup=away,lamp=steady,trace=none
    # sound: taps
- else:
    # camera: bedside
    # transition: ease 1.8
    # arrangement: chair=rest,cup=near,lamp=steady,trace=none
    # sound: taps
}
# scene: rail
# weather: none
# chapter: Two small taps
# mood: hushed
Beside the chair, a short rail marks the edge of the bedside place. The blue pattern of the cup stays small but distinct.

{last_response == "cup":
    "They always turned the chip away from my mouth. Even when I didn't drink."
}
{last_response == "care":
    "Yes. I couldn't always answer. They brought it anyway."
}
{last_response == "cup_quiet":
    In memory, the cup holds its shape while you watch.
    "The chip went on the far side. I hadn't remembered that until now."
}

Two small taps sound against the metal rail, then a pause.

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
// Hold the bedside shot. Ease 1.2 settles a consent response; identical camera targets stay still.
{last_response == "tapped":
    # camera: bedside
    # transition: ease 1.2
    # arrangement: chair=turned,cup=near,lamp=steady,trace=none
    # sound: taps
- else:
    # camera: bedside
    # transition: ease 1.2
    # arrangement: chair=rest,cup=near,lamp=steady,trace=none
    # sound: none
}
# scene: hand
# weather: none
# chapter: Permission
# mood: warm
{last_response == "hospital":
    Beyond the rail, a curtain leaves a gap you cannot see through.
    "It could have been. There were wheels under the bed. A curtain that never quite closed. But that isn't what I miss."
}
{last_response == "tapped":
    The empty chair turns a little. The interval beside the rail remains open.
    "You waited for me to answer. Thank you."
}
{last_response == "pause":
    There is room beside the rail. Nothing interrupts the pause.
    "That was the part I trusted. They could have reached for me. They waited instead."
}

"May I?" the voice asks.

The empty place remains within reach.

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
// 1.2s dissolve is an editorial return to the whole arrangement, not a splitting landscape.
# camera: wide
# transition: dissolve 1.2
# arrangement: chair=rest,cup=near,lamp=steady,trace=none
# sound: none
# scene: contradiction
# weather: rain-memory
# chapter: The other side of the chair
# mood: uneasy
# audio soundtrack_2.mp3
{last_response == "offered":
    There is no weight against your palm, only a patch of warmth.
}
{last_response == "close":
    The warmth stays between you.
}
{last_response == "listen":
    "All right." There is room for your stillness.
}

"Wait. I remember bringing the tea. I remember rain running off my sleeve."

The chair stands beside the rail. The cup rests where either person might have left it.

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
// 1.8s ease leaves the bedside interval open, equally for inquiry, uncertainty and reassurance.
# camera: bedside
# transition: ease 1.8
# arrangement: chair=rest,cup=near,lamp=steady,trace=none
# sound: none
# scene: boundary
# weather: none
# chapter: A story that can remain open
# mood: uneasy
{last_response == "follow":
    The cup, rail and chair hold separate shapes, without explaining how they belong together.
    "The cup. The rail. The chair. Those stay when the faces don't. Let's keep those."
}
{last_response == "uncertain":
    The interval beside the chair remains; you no longer have to choose a side.
    "I'd like that. I've been trying to make the pieces agree. It hurts less when I stop."
}
{last_response == "stay":
    You keep beside the voice, in the place you already share.
    "You can't promise to stay forever. But you are here now. I can work with now."
}

The curtain leaves a narrow gap. There is room to be here, but not to force an answer through.

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
// 1.8s ease makes room for still water; the lamp and objects remain available.
# camera: water
# transition: ease 1.8
# arrangement: chair=rest,cup=near,lamp=steady,trace=none
# sound: none
# scene: quiet
# weather: none
# chapter: Room to breathe
# mood: hushed
{last_response == "honest":
    "Then I can stop trying to sound certain."
}
{last_response == "known":
    "Careful hands. Yes. I can believe that without finding a face."
}
{last_response == "unanswered":
    "You let it remain a question. I didn't know I could ask for that."
}

Still water leaves room beyond the stone, with nothing asking to be crossed. Beside the chair, the lamp is a small, steady point.

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
// 1.8s ease attends to the same cup; its orientation recalls the authored memory flag.
{memory_cup:
    # camera: cup
    # transition: ease 1.8
    # arrangement: chair=turned,cup=away,lamp=steady,trace=none
    # sound: none
- else:
    # camera: cup
    # transition: ease 1.8
    # arrangement: chair=turned,cup=near,lamp=steady,trace=none
    # sound: none
}
# scene: recollection
# weather: none
# chapter: What holds its shape
# mood: warm
The cup and rail remain beside the chair, where memory first gave them weight.

{last_response == "shared_quiet":
    The pause belongs to neither of you alone.
    "I heard the two taps again. This time, I wasn't waiting for anything after them."
}
{last_response == "here":
    "I know. You don't have to keep proving it."
}
{last_response == "look_back":
    Their shapes hold still beneath your attention. The space between them stays unfinished.
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
// 1.8s ease selects one remembered detail. Matching shots/arrangements hold;
// a chair reset gently reframes a chair-relative cup shot before it settles.
{
    - keepsake == "cup":
        # camera: cup
        # transition: ease 1.8
        # arrangement: chair=rest,cup=away,lamp=steady,trace=none
        # sound: none
    - keepsake == "taps":
        # camera: bedside
        # transition: ease 1.8
        # arrangement: chair=rest,cup=near,lamp=steady,trace=none
        # sound: taps
    - else:
        # camera: chair
        # transition: ease 1.8
        # arrangement: chair=turned,cup=near,lamp=steady,trace=none
        # sound: none
}
# scene: preparation
# weather: none
# chapter: Before the light changes
# mood: hushed
# audio soundtrack_3.mp3
Beside the light, the chosen memory holds its shape. Its place in the room remains clear.

{keepsake == "cup":
    The cup holds its chip on the far side.
    "A small kindness. Small enough to do again."
}
{keepsake == "taps":
    Two taps sound against the rail.
    "And then wait. Don't forget that part."
}
{keepsake == "chair":
    The chair offers a place beside you, its seat still empty.
    "A place someone can take. Or leave empty."
}

The lamp holds its small circle. The voice does not disappear.

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
// 1.8s ease restores the shared view before the final choice; no predicted ending or brightness reward.
{keepsake == "cup":
    # camera: wide
    # transition: ease 1.8
    # arrangement: chair=turned,cup=away,lamp=steady,trace=none
    # sound: none
- else:
    # camera: wide
    # transition: ease 1.8
    # arrangement: chair=turned,cup=near,lamp=steady,trace=none
    # sound: none
}
# scene: decision
# weather: none
# chapter: A way to leave
# mood: resolved
{last_response == "next":
    "Yes. It doesn't have to be a promise that I return. It can simply be a light."
}
{last_response == "elsewhere":
    "I'd like that. Something ordinary, in an ordinary room."
}
{last_response == "ready":
    "I'm ready to stop searching tonight. Thank you for asking."
}

The lamp holds the chair, cup and rail in one small arrangement. Beyond it, the shore remains open.

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
// 1.2s dissolve replaces the selected cup with its trace; the cup shot holds the faint seat ring legibly.
{keepsake == "cup":
    # camera: cup
    # transition: dissolve 1.2
    # arrangement: chair=turned,cup=absent,lamp=steady,trace=cup
- else:
    # camera: wide
    # transition: dissolve 1.2
    # arrangement: chair=turned,cup=near,lamp=steady,trace=none
}
{keepsake == "taps":
    # sound: taps
- else:
    # sound: none
}
# scene: keep
# weather: none
# chapter: A place remains
# mood: resolved
# ending: keep
# audio end_credits.mp3
The empty chair holds its place in the lamp's circle. You leave the shade crooked.

"Not a summons," the voice says. "A place."

{silence_count >= 3:
    There is room for the quiet you learned to share. Neither of you needs to fill it.
- else:
    The last words settle into the hum. You let them stay there.
}

{keepsake == "cup":
    On the seat, a blue ring remains where the cup stood.
}
{keepsake == "taps":
    Two small taps answer from somewhere inside the light.
}
{keepsake == "chair":
    The smooth side of the seat catches the light.
}

There is no door to close. The lamp keeps its small circle.
-> END

=== carry ===
// 1.2s dissolve opens the shore view. Only a selected cup leaves; taps/chair retain the physical cup.
{keepsake == "cup":
    # camera: shore
    # transition: dissolve 1.2
    # arrangement: chair=rest,cup=absent,lamp=steady,trace=none
- else:
    # camera: shore
    # transition: dissolve 1.2
    # arrangement: chair=turned,cup=near,lamp=steady,trace=none
}
{keepsake == "taps":
    # sound: taps
- else:
    # sound: none
}
# scene: carry
# weather: none
# chapter: A kindness carried
# mood: resolved
# ending: carry
# audio end_credits.mp3
Beyond the bedside place, the shore opens toward still water. The lamp remains beside the chair. Its remembered warmth rests briefly against your open hand.

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
// 1.2s dissolve establishes a complete restful arrangement; no further timed fading.
{keepsake == "cup":
    # camera: bedside
    # transition: dissolve 1.2
    # arrangement: chair=turned,cup=away,lamp=rest,trace=none
- else:
    # camera: bedside
    # transition: dissolve 1.2
    # arrangement: chair=turned,cup=near,lamp=rest,trace=none
}
{keepsake == "taps":
    # sound: taps
- else:
    # sound: none
}
# scene: rest
# weather: none
# chapter: A room at rest
# mood: resolved
# ending: rest
# audio end_credits.mp3
The chair remains inside the lamp's circle. The light rests softly on the stone.

"We can stop here," the voice says.

{silence_count >= 3:
    You know this pause. It does not ask you to become someone different. You share it as you are.
- else:
    This time you let the pause last. Nothing asks for another answer.
}

{keepsake == "cup":
    The cup's blue pattern holds its color in the quiet room.
}
{keepsake == "taps":
    Two taps, then the space after them. You wait together.
}
{keepsake == "chair":
    The chair remains empty. You have made room without deciding who must fill it.
}

The voice rests beside the lamp. When you rise, you do so in your own time.
-> END

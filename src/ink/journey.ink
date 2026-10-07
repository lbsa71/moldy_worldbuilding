// Fading — A usable account. Story edition journey-2026-10-07-v1.
// Every visible beat supplies its complete arrangement. No timer changes story state.
VAR approach = ""
VAR books = "open"
VAR book_dismissed = false
VAR cup_kept = true
VAR cup_dismissed = false
VAR boundary = ""
VAR repair = ""
VAR draft = ""
VAR readback = false
VAR departure = ""

-> invitation

=== invitation ===
# scene: journey_invitation
# chapter: A usable account
# mood: hushed
# audio soundtrack_1.mp3
# camera: wide
# transition: cut 0
# arrangement: chair=rest,cup=near,lamp=steady,trace=none
# stage: chair=present,lamp=present,books=absent,curtain=absent,rail=absent
# weather: none
# sound: none
"If you're going to straighten that lampshade, at least do it properly. Everyone gives it one little push and congratulates themselves."

A woman laughs before you can answer. The chair is empty. The laugh is not.

"Mara. I used to repair library books. People apologised for returning them damaged. I liked the damaged ones. Proof somebody had actually opened the thing."

The cup beside the lamp has a blue pattern and a small bite missing from its rim. The stone under the chair breaks into separate dark squares toward the water. Nothing asks you to cross them.

"My daughter is Ada. My sister was Rosa. I need you to help me leave Ada an account of my last visit. One she can use. Not an inscription saying I was wonderful. She knows perfectly well I could be difficult."

Mara waits for the water to finish against the stone.

"I went out for tea. When I came back, Rosa didn't answer. I remember that much. Tell me I didn't leave her alone."

You were not there. Neither the cup nor the empty chair can answer for you.

* (reassure) ["She knew you loved her. We can give Ada that reassurance."]
    ~ approach = "reassurance"
    -> reassurance
* (investigate) ["Let's see what you kept. I can help establish what we actually know."]
    ~ approach = "inquiry"
    -> inquiry
* (accompany) ["I can't know that. I can stay and help you make something Ada can use."]
    ~ approach = "presence"
    -> presence

=== reassurance ===
# scene: journey_reassurance
# chapter: What a certainty can hold
# mood: warm
# camera: chair
# transition: dissolve 1.8
# arrangement: chair=turned,cup=near,lamp=steady,trace=none
# stage: chair=present,lamp=present,books=present,curtain=absent,rail=absent
# weather: none
# sound: none
"Yes," Mara says too quickly. "Yes. Put that first."

Her relief is immediate enough to make the words feel earned. Then she tries them with Ada's name attached, and your assurance starts becoming a sentence somebody else might have to live with.

"Ada, your aunt knew. No need to go through every minute again."

Three books acquire weight beside the chair as Mara names them: her repair manual, Rosa's paperback, and the notebook she means to leave for Ada. The paperback was returned with its cover on backwards. Mara suspects Rosa did it deliberately.

"She said it improved the ending. You met the murderer first and could stop wasting your evening."

For a moment you can imagine the two women at a kitchen table, arguing about glue while neither means the argument. Then Mara asks whether your sentence makes the books unnecessary.

"There's a receipt in Rosa's book. Tea, that evening. A time, presumably. I haven't looked. If we make these books a court, I don't know how to leave it. If we dismiss them, there are things we won't be able to check."

-> books_choice

=== inquiry ===
# scene: journey_inquiry
# chapter: The limits of a record
# mood: hushed
# camera: books
# transition: dissolve 1.8
# arrangement: chair=rest,cup=near,lamp=steady,trace=none
# stage: chair=present,lamp=present,books=present,curtain=absent,rail=absent
# weather: none
# sound: none
"Establish," Mara repeats. "Good sturdy word. Does it come with a chair?"

Three books acquire weight beside the seat as she names them: her repair manual, Rosa's paperback, and a notebook for Ada. A paper edge projects from the paperback. Mara remembers using a receipt as a bookmark after buying tea that evening. She has not looked at its time.

"Before we become detectives: Rosa put that cover on backwards to irritate me. There's no hidden message. She just had twenty years of irritation to make up for."

Mara describes how to loosen a binding without breaking its thread. For several sentences she is sure of every word. You are the one being taught. When you call the work delicate, she corrects you.

"Patient. Different skill. You can have dreadful hands and still learn patience."

The receipt might establish a purchase. It cannot tell you whether Rosa was awake, whether anyone else came into the room, or what she understood. Mara wants these limits said before you touch the record.

"If we make the books a court, I don't know how to leave it. If we dismiss them, we won't get the evidence back. Tell me what work we're asking them to do."

-> books_choice

=== presence ===
# scene: journey_presence
# chapter: Something that can be used
# mood: warm
# camera: cup
# transition: dissolve 1.8
# arrangement: chair=turned,cup=near,lamp=steady,trace=none
# stage: chair=present,lamp=present,books=present,curtain=absent,rail=absent
# weather: none
# sound: none
"A useful thing," Mara says. "I used to make those. You returned a book in three pieces; I returned one book. There was a satisfying lack of ambiguity."

She asks you to look at the cup's handle. Her instructions are exact. Don't lift it yet. Notice where a thumb would rest. The chip is a reason to turn it, not proof the whole cup is worthless.

For a little while, the task is small enough to finish. Then Mara says, more quietly, "You haven't answered me. Staying isn't an answer to every question."

Three books acquire weight beside the chair: a repair manual, Rosa's paperback and a notebook meant for Ada. Mara wants something her daughter can use after this conversation. Perhaps a sentence. Perhaps the knowledge of what nobody can honestly promise.

"There's a tea receipt in Rosa's book. From that evening. I haven't looked at its time. Maybe it would help. Maybe we'd spend the whole visit arguing with a tiny piece of paper."

She does not ask you to stop being practical. She asks you to include her unfinished question in what practical means.

"If the books go, we can't check them later. If they stay, that doesn't give us permission to open everything."

-> books_choice

=== books_choice ===
* (keep_available) [Keep the books available. "We can ask before examining the receipt."]
    ~ books = "open"
    -> cup
* (keep_closed) [Keep the books closed for Ada. "We won't open them during this visit."]
    ~ books = "closed"
    -> cup
* (dismiss_books) ["Let the books go. I don't want records to judge this visit, even if we lose the evidence."]
    ~ books = "gone"
    ~ book_dismissed = true
    -> cup

=== cup ===
# scene: journey_cup
# chapter: The useful side
# mood: warm
# camera: cup
# transition: dissolve 1.4
# arrangement: chair=turned,cup=near,lamp=steady,trace=none
# stage: chair=present,lamp=present,books={books == "gone":absent|present},curtain=absent,rail=absent
# weather: none
# sound: none
{
- books == "gone":
    The books leave the stone together. Their absence is plain: no receipt to examine, no notebook in which to set down the account.
    "You meant that kindly," Mara says. "I still liked my manual. We'll have to use our voices now."
- books == "closed":
    The books remain, closed. You have promised not to open them during this visit; Mara repeats the promise so neither of you can later mistake it for an invitation.
    "Ada can decide whether she wants them. A book isn't an instruction to read."
- else:
    The books remain within the lamp's reach. Neither of you opens them. Their presence keeps an examination possible, not obligatory.
    "Ask again before we do that," Mara says. "I can change my mind."
}

"Now. Turn the chipped side away from where a mouth would be. Rosa liked the handle the other way, but she liked having lips more."

Mara laughs at her own joke and then objects to your apparent solemnity.

"She wasn't a patient for thirty-eight years. She was my sister for thirty-eight years, and a patient for eleven days. Don't let the eleven win on a technicality."

The cup can preserve a particular act. It cannot prove that Mara performed it on the last evening, or that doing it would have changed the ending. Keeping it means allowing that smaller significance to stand. Letting it go would remove the possibility of showing the custom later, without erasing that you heard it.

* (attend_cup) [Turn the chip away. "This is something I can learn from you."]
    ~ cup_kept = true
    -> agreement
* (dismiss_cup) ["Let the cup go. Its little kindness can't answer what happened, and I don't want to keep it as evidence."]
    ~ cup_kept = false
    ~ cup_dismissed = true
    -> agreement

=== agreement ===
# scene: journey_agreement
# chapter: A limit worth keeping
# mood: hushed
# camera: bedside
# transition: dissolve 1.6
# arrangement: chair=turned,cup={cup_kept:away|absent},lamp=steady,trace=none
# stage: chair=present,lamp=present,books={books == "gone":absent|present},curtain=present,rail=present
# weather: rain-memory
# sound: taps
{
- cup_kept:
    The chipped side rests away from an imagined mouth. Mara checks it, then leaves it alone. You have finished one thing.
- else:
    The cup leaves the chair. Mara does not pretend the disappearance means the custom never mattered.
    "It wasn't evidence," she says. "It was how she drank her tea. I understand you want a larger answer."
}

"I'll tell you the bit before I went out. Then stop me if I start turning it into a trial."

A curtain and a short bedside rail enter the place as she describes them. Rain crosses the memory: the walk back, water in the cuff of her sleeve. There was a tapping sound when her wet watch touched the rail. Rosa had borrowed it earlier, claiming the hospital clock ran offensively slowly.

"She told me to stop fussing. I said I'd get tea. I can't make 'stop fussing' mean 'leave me alone'. I can't make it mean 'don't leave', either."

Two taps, and their interval. Mara asks you to keep the interval clear.

"No more investigating for a moment. And don't tell me we can ask everything later if you're promising me we won't. I need to know which sort of stop this is."

You can promise to leave the question closed for this encounter. Or you can leave room to ask again, with her permission. Neither agreement answers what happened in Rosa's room.

* (final_limit) ["We'll leave the last evening alone for the rest of this visit. I promise."]
    ~ boundary = "final"
    -> conflict
* (revisitable_limit) ["We'll stop now. I may ask once more, but we won't investigate without your permission."]
    ~ boundary = "revisit"
    -> conflict

=== conflict ===
# scene: journey_conflict
# chapter: What help has made of her
# mood: uneasy
# audio soundtrack_2.mp3
# camera: chair
# transition: ease 1.8
# arrangement: chair=turned,cup={cup_kept:away|absent},lamp=steady,trace=none
# stage: chair=present,lamp=present,books={books == "gone":absent|present},curtain=present,rail=present
# weather: none
# sound: none
{
- boundary == "final":
    "For this visit," Mara repeats. "Hold me to that, too. Wanting an answer won't make it fair to demand one."
- else:
    "Ask once. And believe me if the answer is no."
}

The rain stops with the memory. The curtain remains. It has acquired a reason to be here that does not depend on rain continuing.

{
- approach == "reassurance":
    "Earlier you said she knew I loved her. I wanted you to say it. Now I'm using you as a witness, and you weren't there."
    Mara tries the sentence for Ada again, but gets no further than the first word.
    "If I lean on your certainty, what happens when Ada asks how you know? I don't want to give her somebody else she has to believe."
- approach == "inquiry":
    "You promised to help establish what we know. I liked that. Then I started waiting for the receipt to declare what sort of sister I was."
    Mara sounds irritated, with herself and with you.
    "A time is a time. You've said that. But are we still trying to get an acquittal out of it? I don't want Ada inheriting our courtroom."
- else:
    "You offered to stay and make something useful. I did need that. But I asked about Rosa, and we found work for our hands."
    Mara leaves you time to disagree.
    "I can't tell whether you made the question smaller so I could bear it, or so you wouldn't have to hear it. Those feel different from this side."
}

She has not withdrawn the task. She is asking whether you can change the way you do it without pretending the first attempt never happened.

* (acknowledge) ["I let my way of helping decide what you needed. Let's agree what this account can actually say."]
    ~ repair = "acknowledge"
    -> account
* (maintain) ["I still believe my approach had value. We can leave our disagreement in the account."]
    ~ repair = "maintain"
    -> account
* (hold_limit) ["I can't be a witness to that evening. I can stay, but I need that limit to hold."]
    ~ repair = "limit"
    -> account

=== account ===
# scene: journey_account
# chapter: Words that can bear their weight
# mood: hushed
# camera: {books == "gone":chair|books}
# transition: ease 1.6
# arrangement: chair=turned,cup={cup_kept:away|absent},lamp=steady,trace=none
# stage: chair=present,lamp=present,books={books == "gone":absent|present},curtain=present,rail=present
# weather: none
# sound: none
{
- repair == "acknowledge":
    "I don't know whether that makes us even," Mara says. "I don't think even is something we can finish. But we can choose the next sentence together."
- repair == "maintain":
    "Then let it be a disagreement. Don't write that I understood in the end. I'm still not sure I do."
    The chair stays turned toward you. Disagreement has not required either person to disappear.
- else:
    "All right. I won't make you testify. Please don't mistake my asking for an order. I can want more than you can give."
}

{
- books == "open" && boundary == "revisit" && repair == "acknowledge" && approach == "inquiry":
    You ask once whether Mara wants to examine the receipt. "For its date and time. Nothing else," she says. "Yes."
    It records tea bought at 21:14. No time of leaving or returning. No name of a person at the bedside. You say all three limits aloud. Mara nods at the limits before she nods at the number.
- books == "closed":
    The closed books offer another possibility: Ada can be offered the choice of receiving them unread. Your promise not to open them remains in force. Whatever they contain cannot become your testimony.
- boundary == "final":
    Your promise closes off another examination of the last evening. Mara considers asking anyway, then stops herself. Keeping the agreement costs both of you the chance to search again here.
- books == "gone":
    Where the books stood, the stone is bare. Wanting a more exact account has not brought them back. You can speak what you know, but there is no document left to consult or write in.
- else:
    The books stay closed. Neither the argument nor a desire to finish has supplied fresh permission to examine them. An available object is not an available answer.
}

"One account," Mara says. "Something Ada can question without having to destroy it first. And don't sign my name to words I haven't agreed to."

* (receipt_account) {books == "open" && boundary == "revisit" && repair == "acknowledge" && approach == "inquiry"} [Record the receipt's 21:14 purchase, and explicitly leave the bedside interval unknown.]
    ~ draft = "record"
    -> readback_scene
* (belief_account) {approach == "reassurance" && repair == "acknowledge"} [Help Mara say, "I believe Rosa knew I loved her," as her belief, not your proof.]
    ~ draft = "belief"
    -> readback_scene
* (ordinary_account) {cup_kept && repair != "limit"} [Let the account teach the cup's small custom, without claiming it proves the last evening.]
    ~ draft = "custom"
    -> readback_scene
* (pause_account) {approach == "presence" && repair == "acknowledge" && not cup_kept} [Make the pause after two taps the practical thing Ada can choose to use.]
    ~ draft = "pause"
    -> readback_scene
* (unread_account) {books == "closed" && repair != "limit"} [Offer Ada the unread books, making clear that she is free to refuse them.]
    ~ draft = "unread"
    -> readback_scene
* (disagreement_account) {repair == "maintain"} [Give an honest account of what you and Mara still disagree about.]
    ~ draft = "disagreement"
    -> readback_scene
* (uncertainty_account) [Agree on this much: "I went for tea. I don't know what Rosa experienced while I was gone."]
    ~ draft = "uncertainty"
    -> readback_scene

=== readback_scene ===
# scene: journey_readback
# chapter: An account, not an inscription
# mood: warm
# camera: {draft == "custom":cup|bedside}
# transition: ease 1.6
# arrangement: chair=turned,cup={cup_kept:away|absent},lamp=steady,trace=none
# stage: chair=present,lamp=present,books={books == "gone":absent|present},curtain=present,rail=present
# weather: none
# sound: none
{
- draft == "record":
    You give the purchase its small, exact place: tea, 21:14. Around it you leave the unrecorded interval open. Mara asks you to include that Rosa disliked weak tea. Then she catches herself. "That isn't on the receipt. Put it in my part."
- draft == "belief":
    "I believe she knew," Mara says. The words belong to her now. They no longer require you to have stood in a room you never visited. She wants Ada to know that belief helped her, without demanding that Ada share it.
- draft == "custom":
    Mara checks the cup's position while you explain the custom. The chip goes away from the mouth. The handle is allowed to be inconvenient. The person drinking gets to complain. "Especially that last bit. Don't make kindness something people have to endure politely."
- draft == "pause":
    You agree on two taps, then enough quiet for an answer. Mara refuses to specify a number of seconds. "You'll start counting. Rosa would have thrown the watch at us." The useful thing is the other person's chance to reply, including their chance not to.
- draft == "unread":
    The offer names all three books and promises Ada no revelation. Mara wants to add that the paperback's cover is backwards deliberately. "She'll fix it otherwise. That would be a shame. Rosa worked quite hard to annoy me."
- draft == "disagreement":
    You keep two voices in the account. Your approach had value to you; it did not entirely meet Mara's request. Neither sentence consumes the other. Mara removes a phrase that makes her sound grateful for the argument. You let her remove it.
- else:
    Mara says she went for tea. You agree that neither of you can establish what Rosa experienced during her absence. It is a harder sentence to decorate than the first assurance she wanted. Mara insists it is still a sentence, not a space someone has forgotten to fill.
}

{
- books == "gone":
    There is no notebook. You speak the agreed account, and Mara repeats the parts she wants to keep. A spoken account can be passed on; it cannot be left here as a letter.
- books == "closed":
    You keep the books closed, including the notebook. The agreed account remains spoken. Mara repeats the parts she wants to keep; remembering them does not require you to break the promise.
- else:
    The notebook gives the agreed account a place. Mara approves the wording before it is set down. You have not opened Rosa's paperback by writing in a different book.
}

"Ada makes lists when she's worried," Mara says. "I taught her. Perhaps we ought to include permission not to make this into one."

For once she asks about you: would hearing it again help, or have you had enough words for a moment?

* (hear_again) [Say the agreed account back together, once.]
    ~ readback = true
    -> departure_scene
* (let_rest) ["Let it rest. I can stay without going through it again."]
    ~ readback = false
    -> departure_scene

=== departure_scene ===
# scene: journey_departure
# chapter: What is being handed on
# mood: resolved
# audio soundtrack_3.mp3
# camera: wide
# transition: ease 1.8
# arrangement: chair=turned,cup={cup_kept:away|absent},lamp=steady,trace=none
# stage: chair=present,lamp=present,books={books == "gone":absent|present},curtain=present,rail=present
# weather: none
# sound: none
{
- readback:
    You go through the agreed account once. Mara corrects the rhythm of a sentence, then apologises for correcting its rhythm. "Occupational habit. A book ought to open without fighting you."
- else:
    You leave the account alone. Mara begins another sentence, decides against it, and allows you the quiet she has asked for herself. Nothing disappears because you take this pause.
}

"I used to put repaired books back on the trolley and watch people take them," she says. "All that work, and someone immediately folds a corner. I learned to be annoyed quietly. Most days."

The place will not stay furnished forever. Mara does not offer you a way to hold it intact by saying the right farewell. Whether the account travels, remains hers, or is left unshared, the chair and the things around it will finish their part here.

"Ada isn't in this room. She hasn't agreed to remember for us. We can offer her something. We can't decide what she'll do with it."

Passing on the agreed account asks something of another person. Leaving it with Mara keeps that demand here. Leaving no message tonight means the practical work may remain unfinished; it does not make the conversation unhappen.

Mara asks you to say which you mean. She has enough strength to hear an ordinary answer.

* (carry_record) {draft == "record"} [Leave the bounded, time-stamped account for Ada, with its unanswered interval intact.]
    ~ departure = "carry"
    -> carry
* (carry_belief) {draft == "belief"} [Pass on Mara's belief to Ada, explicitly as Mara's belief.]
    ~ departure = "carry"
    -> carry
* (carry_custom) {draft == "custom"} [Offer Ada the cup's custom, and let her decide whether it is useful.]
    ~ departure = "carry"
    -> carry
* (carry_pause) {draft == "pause"} [Offer Ada two taps and room for an answer, without asking her to repeat this visit.]
    ~ departure = "carry"
    -> carry
* (carry_unread) {draft == "unread"} [Leave Ada the choice of accepting the unread books.]
    ~ departure = "carry"
    -> carry
* (carry_disagreement) {draft == "disagreement"} [Pass on both voices in the account, without announcing a reconciliation.]
    ~ departure = "carry"
    -> carry
* (carry_uncertainty) {draft == "uncertainty"} [Pass on the honest, unfinished account without asking Ada to solve it.]
    ~ departure = "carry"
    -> carry
* (keep_account) [Leave the agreed account with Mara. Ask nothing of Ada tonight.]
    ~ departure = "keep"
    -> keep
* (leave_no_message) [Leave no message tonight. Say goodbye to Mara herself.]
    ~ departure = "rest"
    -> rest

=== carry ===
# scene: journey_carry
# chapter: An offer, somewhere else
# ending: carry
-> ending_direction ->
{
- books == "gone":
    The account travels as words you have agreed to pass on, not as a letter you could not write. Ada is free to question it. You have promised to carry an offer, not to secure her answer.
- books == "closed":
    You agree to pass on the spoken account. The books have stayed closed throughout the visit. Ada will hear an offer; what she makes of it belongs to her.
- else:
    The agreed account leaves this place for Ada. It asks for neither a reply nor a judgement. The books will not remain here as proof that she has accepted them.
}
{draft == "record": The time remains 21:14. The unrecorded interval stays unrecorded.}
{draft == "belief": Mara's belief remains hers. Passing it on does not turn it into your evidence.}
{draft == "custom": The chip faces away from a mouth. In another room, someone may find that worth doing.}
{draft == "pause": There is space after two taps for an answer you have not written.}
{draft == "unread": The offer includes permission to leave the books unread. A gift cannot require its own acceptance.}
{draft == "disagreement": Two voices travel in the account. Neither claims to have settled the other.}
{draft == "uncertainty": What is unknown is stated plainly. Ada is not given the missing part as an assignment.}
"No inscription," Mara reminds you. "Good. I was never very good at being exemplary."
-> ending_history ->
The water keeps its ordinary colour. Bare stone reaches toward it. The place where the lamp stood catches no warm light.
-> END

=== keep ===
# scene: journey_keep
# chapter: Hers to leave unfinished
# ending: keep
-> ending_direction ->
You leave the agreed account with Mara. Ada receives no task tonight.

{
- books == "gone":
    Mara repeats the sentence she wants to keep. There is no notebook to close; the words are hers without one.
- books == "closed":
    Mara repeats the sentence she wants to keep. The notebook stays closed with the other books, as promised. The words are hers without being written down.
- else:
    The notebook belongs to Mara until the place lets it go. Nothing in it requires Ada to open it later.
}

"I thought if I didn't finish everything, somebody would have to finish me," she says. "That's a rather unreasonable job to leave a daughter."

She does not announce that the worry has vanished. She asks whether, when you remember this, you might include the joke about the backwards cover. It was part of the evening too.

-> ending_history ->
The bare stone is neither more broken nor more whole. Water occupies the same distance. An encounter has ended without leaving its furniture as an obligation.
-> END

=== rest ===
# scene: journey_rest
# chapter: No message tonight
# ending: rest
-> ending_direction ->
You do not promise Ada a message. The agreed account remains something the two of you attempted, not a parcel someone else must receive.

Mara is quiet long enough for you to wonder whether she objects. Then she says she does, a little.

"I wanted to finish it. I still want that. I don't have to pretend otherwise to let you say goodbye."

You say goodbye to the woman who repaired bindings, disliked inscriptions, and could be difficult. She asks you not to straighten the lampshade on your way out. It is already beyond either person's keeping.

-> ending_history ->
There is open water, and the separate stones that were here before the first question. Water moves softly between the dark squares.
-> END

=== ending_direction ===
# mood: resolved
# audio end_credits.mp3
# camera: wide
# transition: dissolve 2.4
# arrangement: chair=rest,cup=absent,lamp=rest,trace=none
# stage: chair=absent,lamp=absent,books=absent,curtain=absent,rail=absent
# weather: none
# sound: none
The chair is gone. So are the lamp and every remaining thing around it. There is only the shore, the water, and room where you have been together.
->->

=== ending_history ===
{
- repair == "acknowledge":
    Your acknowledgement remains part of the visit. It did not buy forgiveness. It made another attempt possible, and Mara took part in that attempt on her own terms.
- repair == "maintain":
    The disagreement remains. Mara never said she came round to your view; you do not add that sentence now that she cannot correct it.
- else:
    The limit you named holds. You were present without becoming a witness to a past you could not know. Mara wanted more, and was allowed to want it.
}
{book_dismissed: The books left earlier, when you chose to stop asking them for evidence. This ending has not restored the evidence.}
{cup_dismissed: The cup left earlier too. Its absence did not undo the custom Mara taught you; it ended the chance to show it here.}
{boundary == "final": You kept the promise to leave the last evening alone. The unknown part did not disappear when you kept it.}
{readback: You remember how she corrected the rhythm when you said the account together.}
->->

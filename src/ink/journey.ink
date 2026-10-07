// Fading — A usable account. Story edition journey-2026-10-07-v2.
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
"If you're straightening that lampshade, do it properly." A woman laughs. The chair is empty.

"I'm Mara. I repaired library books. I liked the damaged ones. Proof somebody had opened them."

"My sister Rosa died. My daughter is Ada. Help me leave her an account she can use. No inscription saying I was wonderful."

"I went out for tea. When I returned, Rosa didn't answer. Tell me I didn't leave her alone." You weren't there.

* (reassure) ["She knew you loved her."]
    ~ approach = "reassurance"
    -> reassurance
* (investigate) ["Let's establish what we can know."]
    ~ approach = "inquiry"
    -> inquiry
* (accompany) ["I can't know. I can stay."]
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
"Yes. Put that first." Three books appear: Mara's manual, Rosa's paperback and Ada's notebook.

Mara tries your assurance with Ada's name attached. Your comfort has become somebody else's evidence. Rosa's paperback has its cover on backwards.

"Rosa said it improved the ending. You met the murderer first. Saved an evening."

"A tea receipt waits inside. I haven't checked its time. Let the books go, and we lose that evidence. Keep them, and ask before opening anything."

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
"Establish," Mara repeats. "Good sturdy word. Does it come with a chair?" Three books appear: her manual, Rosa's paperback, Ada's notebook.

Mara teaches you to loosen a binding. "Patience. You can have dreadful hands and still learn that."

"Rosa glued that cover on backwards to annoy me. No hidden message. Don't make her a mystery instead of my sister."

"There's a tea receipt inside. It might establish a purchase, never who stayed with Rosa. Let the books go, and we lose the evidence. Keep them, but ask before opening anything."

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
"A useful thing. I made those. You returned three pieces; I returned one book. Satisfying lack of ambiguity." Three books appear: her manual, Rosa's paperback, Ada's notebook.

Mara shows you the cup's chipped rim. "A reason to turn it. Not to throw the whole thing away."

"You haven't answered me. Staying isn't an answer to everything."

"A tea receipt waits inside. I haven't checked its time. Let the books go, and we lose that evidence. Keep them, and ask before opening anything."

-> books_choice

=== books_choice ===
* (keep_available) [Keep them. Ask before examining evidence.]
    ~ books = "open"
    -> cup
* (keep_closed) [Keep all three closed for Ada.]
    ~ books = "closed"
    -> cup
* (dismiss_books) [Let them go, including their evidence.]
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
    The books disappear. "You meant that kindly. I still liked my manual. No receipt or notebook now. We'll use our voices."
- books == "closed":
    The books stay closed. "All three, for this visit. That's our promise. Ada can decide whether she wants them."
- else:
    The books remain. "Ask before we examine anything. I can change my mind."
}

"Turn the chip away from her mouth. Rosa preferred the handle the other way. She preferred having lips more."

"She was my sister for thirty-eight years. A patient for eleven days. Don't let the eleven win on a technicality."

"The cup can't answer that evening. It can show Ada this little custom. Let it go, and we can't show her here."

* (attend_cup) [Keep the cup. Teach me its custom.]
    ~ cup_kept = true
    -> agreement
* (dismiss_cup) [Let it go. I need larger answers.]
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
A curtain and rail enter her memory. Rain darkens her sleeve. Her watch strikes the rail twice. Then the interval she asks you to leave clear.

{
- cup_kept:
    The chip turns away. Mara checks it, then leaves it alone. You have finished one thing.
- else:
    The cup disappears. "It wasn't evidence," Mara says. "It was how she drank her tea. I understand you want a larger answer."
}

"Rosa said, 'Stop fussing.' I went for tea. I can't make her words mean 'leave me', or 'don't leave'."

"Stop investigating now. Is that a promise for this whole visit, or will you ask again? Don't promise one and mean the other."

* (final_limit) ["No more investigating this visit. I promise."]
    ~ boundary = "final"
    -> conflict
* (revisitable_limit) ["I may ask again. You can refuse."]
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
    "For this visit," Mara repeats. "Hold me to that, too." The rain stops. The curtain remains.
- else:
    "Ask once. Believe me if I say no." The rain stops. The curtain remains.
}

{
- approach == "reassurance":
    "You said Rosa knew I loved her. I wanted that. Now I'm using you as a witness. You weren't there."
    "What happens when Ada asks how you know? I don't want to give her somebody else she has to believe."
- approach == "inquiry":
    "We wanted facts. Now I'm waiting for a receipt to declare what sort of sister I was."
    "Are we still hoping for an acquittal? I don't want Ada inheriting our courtroom."
- else:
    "I asked about Rosa. We found work for our hands. I did need that."
    "Did you make the question smaller so I could bear it, or so you wouldn't have to hear it?"
}

"I still want an account. Can we change how we make it? You don't have to agree with me to stay."

* (acknowledge) ["I mistook my approach for your need."]
    ~ repair = "acknowledge"
    -> account
* (maintain) ["My approach mattered. Keep our disagreement."]
    ~ repair = "maintain"
    -> account
* (hold_limit) ["I can stay, but not as witness."]
    ~ repair = "limit"
    -> account

=== account ===
# scene: journey_account
# chapter: Words that bear their weight
# mood: hushed
# camera: {books == "gone":chair|books}
# transition: ease 1.6
# arrangement: chair=turned,cup={cup_kept:away|absent},lamp=steady,trace=none
# stage: chair=present,lamp=present,books={books == "gone":absent|present},curtain=present,rail=present
# weather: none
# sound: none
{
- repair == "acknowledge":
    "I don't know if that makes us even. But we can choose the next sentence together."
- repair == "maintain":
    "Then keep the disagreement. Don't write that I understood in the end." The chair stays turned toward you.
- else:
    "I won't make you testify. I can still want more than you can give."
}

{
- books == "open" && boundary == "revisit" && repair == "acknowledge" && approach == "inquiry":
    You ask once. "For its time. Nothing else," Mara says. "Yes." The receipt records tea bought at 21:14. No bedside witnesses. No time of return.
- books == "closed":
    All three books remain closed, as promised. You can offer them unread; you can't quote their contents. Any account must be spoken.
- boundary == "final":
    Your promise rules out another examination. Mara starts to ask, then stops herself. Neither of you gets to search again here.
- books == "gone":
    The books haven't returned. There's no receipt to consult, no notebook to write in. You can speak what you know.
- else:
    The books stay closed. An argument hasn't supplied permission to open them.
}

"One account. The receipt can't tell us who stayed. My belief isn't your evidence. A custom isn't proof. Let Ada question us."

* (receipt_account) {books == "open" && boundary == "revisit" && repair == "acknowledge" && approach == "inquiry"} [Record the purchase; leave the interval unknown.]
    ~ draft = "record"
    -> readback_scene
* (belief_account) {approach == "reassurance" && repair == "acknowledge"} [Keep Mara's belief as hers, not proof.]
    ~ draft = "belief"
    -> readback_scene
* (ordinary_account) {cup_kept && repair != "limit"} [Teach the cup's custom, without claiming proof.]
    ~ draft = "custom"
    -> readback_scene
* (pause_account) {approach == "presence" && repair == "acknowledge" && not cup_kept} [Offer two taps, and time to answer.]
    ~ draft = "pause"
    -> readback_scene
* (unread_account) {books == "closed" && repair != "limit"} [Offer the unread books, with no obligation.]
    ~ draft = "unread"
    -> readback_scene
* (disagreement_account) {repair == "maintain"} [Keep both voices in our disagreement.]
    ~ draft = "disagreement"
    -> readback_scene
* (uncertainty_account) [Say honestly what remains unknown.]
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
    Tea, 21:14. The interval stays unknown. "Rosa hated weak tea," Mara adds. "That's not on the receipt. Put it in my part."
- draft == "belief":
    "I believe she knew." Mara owns the belief. Ada needn't share it, and you needn't pretend you were there.
- draft == "custom":
    The chip faces away. "And let her complain about the handle. Don't make kindness something people must endure politely."
- draft == "pause":
    Two taps, then room to answer. Mara refuses to count seconds. "Rosa would've thrown the watch at us."
- draft == "unread":
    Three unread books, no promised revelation. "Tell Ada the backwards cover is deliberate. Otherwise she'll fix it. Rosa worked hard to annoy me."
- draft == "disagreement":
    Both voices remain. Mara removes a phrase that makes her sound grateful for the argument. You let her remove it.
- else:
    "I went for tea. I don't know what Rosa experienced." Mara calls it a sentence, not a gap Ada must fill.
}

{
- books == "gone":
    No notebook remains. You speak the account; Mara repeats it. These words can travel, but there's no letter to leave.
- books == "closed":
    The notebook stays closed too. Your account is spoken. Mara repeats it without asking you to break the promise.
- else:
    Mara approves the words before you write in the notebook. Rosa's paperback hasn't been opened by writing in another book.
}

"Ada makes lists when she's worried. I taught her. Let's not leave her another duty."

"Would hearing it again help you? Or have you had enough words?"

* (hear_again) [Say the account together, once.]
    ~ readback = true
    -> departure_scene
* (let_rest) ["Let it rest. I can stay."]
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
    You say it together once. Mara corrects the rhythm. "Occupational habit. A book should open without fighting you."
- else:
    You let the account rest. Mara starts another sentence, then gives you the quiet she asked for herself. Everything stays where it is.
}

"I repaired books, then watched people fold their corners. Learned to be annoyed quietly. Most days."

The things around you will leave, whatever you decide. "Ada isn't here," Mara says. "She hasn't agreed to remember for us."

"Offer her our account. Or leave it with me. Or no message tonight. I'd be disappointed. I'd still hear your goodbye."

* (carry_record) {draft == "record"} [Offer Ada the record, including its uncertainty.]
    ~ departure = "carry"
    -> carry
* (carry_belief) {draft == "belief"} [Offer Ada Mara's belief, as a belief.]
    ~ departure = "carry"
    -> carry
* (carry_custom) {draft == "custom"} [Offer Ada the cup's custom.]
    ~ departure = "carry"
    -> carry
* (carry_pause) {draft == "pause"} [Offer Ada two taps and room.]
    ~ departure = "carry"
    -> carry
* (carry_unread) {draft == "unread"} [Offer Ada the choice of unread books.]
    ~ departure = "carry"
    -> carry
* (carry_disagreement) {draft == "disagreement"} [Pass on both voices, without claiming agreement.]
    ~ departure = "carry"
    -> carry
* (carry_uncertainty) {draft == "uncertainty"} [Pass on the honestly unfinished account.]
    ~ departure = "carry"
    -> carry
* (keep_account) [Leave it with Mara. Ask nothing of Ada.]
    ~ departure = "keep"
    -> keep
* (leave_no_message) [No message tonight. Say goodbye to Mara.]
    ~ departure = "rest"
    -> rest

=== carry ===
# scene: journey_carry
# chapter: An offer, somewhere else
# ending: carry
-> ending_direction ->
{books == "open":The account travels in writing.|The account travels in your voice; no letter was written.} "No inscription," Mara says. "Good."
{draft == "record":Tea, 21:14. The interval stays unknown.}{draft == "belief":Mara's belief travels as hers, never as your evidence.}{draft == "custom":The chip faces away. Elsewhere, someone can try it.}{draft == "pause":Two taps leave room for an answer you haven't written.}{draft == "unread":Ada can refuse the books, or leave them unread.}{draft == "disagreement":Both voices travel. Neither claims to have settled the other.}{draft == "uncertainty":Ada receives the unknown part without an assignment to solve it.}
-> ending_history ->
-> END

=== keep ===
# scene: journey_keep
# chapter: Hers to leave unfinished
# ending: keep
-> ending_direction ->
{books == "open":The notebook is Mara's to keep or release.|Mara repeats the words. They remain spoken.} Ada receives no task tonight.
"I thought somebody would have to finish me if I didn't finish everything. Unreasonable job to leave a daughter. Remember the jokes, too."
-> ending_history ->
-> END

=== rest ===
# scene: journey_rest
# chapter: No message tonight
# ending: rest
-> ending_direction ->
No message travels. "I wanted to finish it," Mara says. "I still do. I don't have to pretend otherwise to let you say goodbye."
You say goodbye to the woman who repaired books and could be difficult. "Leave the lampshade," she says. It is already beyond your keeping.
-> ending_history ->
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
The chair is gone. The lamp too, and everything around it. Bare stone reaches toward the water.
->->

=== ending_history ===
{repair == "acknowledge":You tried again; Mara promised no forgiveness.|{repair == "maintain":You still disagreed; neither voice won.|You stayed, without becoming a witness.}} {book_dismissed:The books and their evidence stayed gone. }{cup_dismissed:You couldn't show the cup again. }{boundary == "final":Your promise held. }{readback:Her corrections stay with you.}
->->

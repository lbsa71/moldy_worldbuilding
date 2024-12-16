# position: { "x": 0, "z": 0 }
-> knot_1

=== knot_1 ===
This is the first dialogue. Where do you want to go?

- Go to the north. -> knot_2
- Go to the east. -> knot_3
  -> DONE

# position: { "x": 0, "z": 5 }
=== knot_2 ===
You’ve arrived at the north.

- Back to start. -> knot_1
  -> DONE

# position: { "x": 5, "z": 0 }
=== knot_3 ===
You’ve reached the east.

- Back to start. -> knot_1
  -> DONE

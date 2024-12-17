VAR visited_north = false
VAR visited_south = false
VAR visited_east = false
VAR visited_west = false
VAR all_visited = false

# position: { "x": 0, "z": 0 }
-> center

=== function check_all_visited ===
{
    - not all_visited && visited_north && visited_south && visited_east && visited_west:
        ~ all_visited = true
        All locations have been explored! You may continue exploring or head home.
}

=== center ===
You are at the center of the crossroads.
{check_all_visited()}

* Head north. -> north
* Head south. -> south
* Head east. -> east
* Head west. -> west
{all_visited:
    * Return home and end your journey. -> ending
}

# position: { "x": 0, "z": 5 }
=== north ===
You've arrived at the northern point.
~ visited_north = true
{check_all_visited()}

* Go back south to the center. -> center
* Travel east. -> east
* Travel west. -> west
* Travel further south. -> south

# position: { "x": 0, "z": -5 }
=== south ===
You've reached the southern point.
~ visited_south = true
{check_all_visited()}

* Go back north to the center. -> center
* Travel east. -> east
* Travel west. -> west
* Travel further north. -> north

# position: { "x": 5, "z": 0 }
=== east ===
You've arrived at the eastern point.
~ visited_east = true
{check_all_visited()}

* Go back west to the center. -> center
* Travel north. -> north
* Travel south. -> south
* Travel further west. -> west

# position: { "x": -5, "z": 0 }
=== west ===
You've reached the western point.
~ visited_west = true
{check_all_visited()}

* Go back east to the center. -> center
* Travel north. -> north
* Travel south. -> south
* Travel further east. -> east

=== ending ===
Congratulations! You've explored all directions and completed your journey.
-> END
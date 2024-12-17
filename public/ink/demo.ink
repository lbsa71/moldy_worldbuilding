VAR visited_north = false
VAR visited_south = false
VAR visited_east = false
VAR visited_west = false
VAR all_visited = false

# position: 0, 0
-> center

=== function check_all_visited ===
{
    - not all_visited && visited_north && visited_south && visited_east && visited_west:
        ~ all_visited = true
        All locations have been explored! You may continue exploring or head home.
}

=== center ===
You are at the center of the crossroads. # position: 0, 5

{check_all_visited()}

* Head north. -> north
* Head south. -> south
* Head east. -> east
* Head west. -> west
{all_visited:
    * Return home and end your journey. -> ending
}

=== north ===
You've arrived at the northern point. # position: 0,-5 
~ visited_north = true
{check_all_visited()}

* Go back south to the center. -> center
* Travel east. -> east
* Travel west. -> west
* Travel further south. -> south

=== south ===
You've reached the southern point. # position: 5,0
~ visited_south = true
{check_all_visited()}

* Go back north to the center. -> center
* Travel east. -> east
* Travel west. -> west
* Travel further north. -> north


=== east ===
You've arrived at the eastern point. # position: -5, 0
~ visited_east = true
{check_all_visited()}

* Go back west to the center. -> center
* Travel north. -> north
* Travel south. -> south
* Travel further west. -> west

=== west ===
You've reached the western point. # position:  0,5
~ visited_west = true
{check_all_visited()}

* Go back east to the center. -> center
* Travel north. -> north
* Travel south. -> south
* Travel further east. -> east

=== ending ===
Congratulations! You've explored all directions and completed your journey.
-> END
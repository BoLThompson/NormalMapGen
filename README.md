A fun demonstration of a technique to approximately generate normal maps from 3D models, as described here:

https://www.youtube.com/watch?t=999

The red/green directional lighting in ThreeJS seems not to have a smooth, linear relationship to the normal of a surface, so the end result is pretty biased towards normals that face the x/y world axes.
The left three renders are actual 3D rasterizations, the right two renders are textures generated from those rasterizations.

Asteroid model taken from free3d.com user printable_models.

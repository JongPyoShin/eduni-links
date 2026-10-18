# Home Tour — plan-aligned prototype

- Public route: `/home-tour/`; portal cards: root EDUNI Links and the Tailscale NiceGUI Portal.
- No apartment address, building or unit number is embedded in the published page.
- Shared arrays `floor` and `W` drive both 2D comparison map and 3D geometry.
- Source plan was provided as a raster image, not dimensioned CAD. All coordinates and furniture placements are **approximate**; do not use for construction, measurement, or furniture ordering.
- Exterior stairs and elevators in the source plan are intentionally excluded from the apartment scene.
- Front left, central and right balconies have different depths; the rear balcony has a notch beside the kitchen.
- The previously generated AI concept renders are deliberately not reused, because they do not match the source plan.
- Works via Three.js 0.149.0 CDN; if WebGL/CDN is unavailable the 2D layout remains accessible.
- Static checks: JavaScript syntax PASS; 11 navigation points including overview, 18 floor patches, 42 wall sections, all room positions within floor patches, no exact unit identifiers.
- **Not verified:** real browser interaction, phone rotation/pinch, dimensions against on-site measurements, building entry door or exact wall/door thickness.
- Server Portal code is updated in Git, but actual server deployment/restart must be performed separately.

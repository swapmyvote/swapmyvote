# Serves the React SPA shell (the `spa` layout with an empty #root) for any
# route that has been migrated to React. Only paths explicitly routed here in
# config/routes.rb reach this controller — un-migrated paths keep their HAML
# controllers/layout, so Bootstrap 4 (legacy) and Bootstrap 5 (SPA) never load
# in the same document. The react-router route table must stay in lockstep
# with the allow-list of paths pointed at this controller.
#
# Every path in that allow-list is an `/app/*` preview path, never a canonical
# one: no route switches from HAML to React until the whole site is done,
# tested and approved, and then they all switch at once. A finished milestone
# is not a reason to flip its route. See "Cutover strategy" in
# docs/frontend-modernization-plan.md.
class SpaController < ApplicationController
  layout "spa"

  def index
    # Render the `spa` layout with an empty body; React mounts into the
    # layout's #root. Use an explicit html_safe empty string rather than nil
    # so we don't rely on the HTML renderer's nil coercion.
    render html: "".html_safe, layout: true
  end
end

# Serves the React SPA shell (the `spa` layout with an empty #root) for any
# route that has been migrated to React. Only paths explicitly routed here in
# config/routes.rb reach this controller — un-migrated paths keep their HAML
# controllers/layout, so Bootstrap 4 (legacy) and Bootstrap 5 (SPA) never load
# in the same document. The react-router route table must stay in lockstep
# with the allow-list of paths pointed at this controller.
class SpaController < ApplicationController
  layout "spa"

  def index
    render html: nil, layout: true
  end
end

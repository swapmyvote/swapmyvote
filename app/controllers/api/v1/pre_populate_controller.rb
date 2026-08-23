module Api
  module V1
    # Stashes the entry form's answers in the session so they survive the trip
    # out to Devise/OmniAuth and are waiting when the user lands back as a
    # signed-up account.
    #
    # The legacy top-level ApiController#pre_populate does the same thing for
    # inbound deep links from partner sites (`/swap?willing_party_name=...`),
    # keyed on party *names*. This one is for our own SPA, which already knows
    # the ids, and answers with JSON instead of redirecting to the home page.
    # Both write the same session key, so either route can fill the form.
    class PrePopulateController < BaseController
      def create
        session[:pre_populate] = {
          "constituency_ons_id" => constituency_ons_id,
          "preferred_party_name" => party_name(params[:preferred_party_id]),
          "willing_party_name" => party_name(params[:willing_party_id])
        }

        render json: PrePopulateSerializer.new(
          PrePopulatePresenter.new(session[:pre_populate])
        ).to_h
      end

      private

      # Only constituencies we actually run swaps in: the client picks from a
      # list we served, but it is the client, so check.
      def constituency_ons_id
        ons_id = params[:constituency_ons_id].presence
        return nil if ons_id.nil?

        OnsConstituency.find_by(ons_id: ons_id)&.ons_id
      end

      # Stored by name to match what the legacy deep-link route writes, so
      # HomeController#prepopulate_fields_from_session can read either.
      def party_name(id)
        return nil if id.blank?

        Party.find_by(id: id)&.name
      end
    end
  end
end

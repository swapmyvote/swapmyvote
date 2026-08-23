module Api
  module V1
    # A constituency plus its polls, for the review screen's chart.
    #
    # Separate from ConstituencySerializer so the entry form's `#index` — which
    # returns every constituency — never pays for polls it does not draw.
    class ConstituencyDetailSerializer
      include Alba::Resource

      transform_keys :lower_camel

      attributes :ons_id, :name

      # `resource:` and a block together would let the block define its own
      # anonymous resource class — but with `resource:` given, Alba (3.11)
      # never invokes the block at all, so it silently falls back to the raw
      # `constituency.polls` association (unfiltered, table order). What
      # overrides *which object* the association reads from is `source:`,
      # not a block.
      many :polls, resource: PollSerializer, source: ->(params) { params[:polls] }
    end
  end
end

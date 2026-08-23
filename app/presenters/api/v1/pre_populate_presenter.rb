module Api
  module V1
    # What is currently stashed for the entry form. Wraps the raw session hash
    # so the serializer has something with methods to read.
    class PrePopulatePresenter
      def initialize(stash)
        @stash = stash || {}
      end

      def constituency_ons_id
        @stash["constituency_ons_id"]
      end

      def preferred_party_name
        @stash["preferred_party_name"]
      end

      def willing_party_name
        @stash["willing_party_name"]
      end
    end
  end
end

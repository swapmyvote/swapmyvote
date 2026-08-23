module Api
  module V1
    # The election being run for — dates, type, and the prose the SPA builds
    # its headings from. Immutable for the life of a deploy, so it is a
    # separate endpoint the client can cache indefinitely rather than part of
    # the session payload, which is re-fetched on a poll.
    class ElectionController < BaseController
      def show
        render json: ElectionSerializer.new(ElectionPresenter.new(self)).to_h
      end
    end
  end
end

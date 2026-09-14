module Api
  module V1
    # The election being run for — dates, type, and the prose the SPA builds
    # its headings from. Immutable for the life of a deploy, so it is a
    # separate endpoint the client can cache indefinitely rather than part of
    # the session payload, which is re-fetched on a poll.
    class ElectionController < BaseController
      # ApplicationController includes ApplicationHelper, which is where most
      # of ElectionPresenter's methods come from — but not SwapsHelper, and
      # the presenter reads swap_validity_hours through the same context.
      # Included here rather than on ApplicationController: this is the only
      # controller that needs it.
      include SwapsHelper

      def show
        render json: ElectionSerializer.new(ElectionPresenter.new(self)).to_h
      end
    end
  end
end

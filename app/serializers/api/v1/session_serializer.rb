module Api
  module V1
    # The SPA's bootstrap payload — see SessionPresenter. Shape mirrored in
    # app/frontend/types/api.ts, which is the FE/BE contract.
    class SessionSerializer
      include Alba::Resource

      transform_keys :lower_camel

      attributes :app_mode

      # The five operational phases collapse to these four booleans; the SPA
      # reads them for UX only (disable/hide), never as authorisation — every
      # API action re-checks its own gates server-side.
      nested :flags do
        attributes :logins_open, :swapping_open, :voting_open,
                   :voting_info_locked
      end

      one :current_user, resource: UserSerializer

      # `params[:viewer]` tells SwapSerializer which side of the swap is asking.
      one :swap, resource: SwapSerializer
    end
  end
end

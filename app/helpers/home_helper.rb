module HomeHelper
  def pre_login_flow
    return session["pre_login_flow"] || {}
  end

  def pre_login_constituency_form_complete
    !!pre_login_flow["constituency_form_complete"]
  end

  def pre_login_candidates_form_complete
    !!pre_login_flow["candidates_form_complete"]
  end
end

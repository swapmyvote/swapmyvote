module StaticPagesHelper
  def constituency_ons_id_dataset_url
    "https://pages.mysociety.org/2025-constituencies/datasets/parliament_con_2025/latest"
  end

  def forward_democracy_privacy_policy_url
    StaticPagesController::FORWARD_DEMOCRACY_PRIVACY_POLICY_URL
  end

  def link_to_forward_democracy_privacy_policy(text, **options)
    link_to text, forward_democracy_privacy_policy_url,
            **options, target: "_blank", rel: "noopener"
  end
end

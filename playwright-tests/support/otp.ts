// The fixed code SwapMyVote::MessageBird accepts when MESSAGEBIRD_FAKE_OTP is
// set, which Procfile.dev does for the dev and E2E stacks. Dev and CI have no
// MessageBird key, so this is the only way to drive the journey against the
// real controller.
export const fakeOtp = "123456";

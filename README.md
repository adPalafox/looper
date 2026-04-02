# Rekindled Loop

A small browser RPG made with Phaser 3.

You live short lives, unlock Soul Traits, discover hidden paths, and chase a true ending across repeated reincarnations. Progress carries between runs through saved base stats, traits, and world-state flags.

## Analytics Setup

This project is wired for PostHog, but analytics stay disabled until you add your project key.

Update `window.POSTHOG_CONFIG` in `index.html`:

- `apiKey`: your PostHog project API key
- `apiHost`: keep the default unless your PostHog project uses another region
- `enabledHostnames`: production hostnames allowed to send analytics
- `sessionRecordingSampleRate`: replay sampling rate
- `feedbackUrl`: optional link for a feedback form shown on death and true-ending screens

With `apiKey` left empty, analytics do nothing.

## What It Is

- A text-driven reincarnation RPG
- One Phaser scene with branching story events
- Persistent progression with `localStorage`
- Static-site friendly with no build step

## How To Run

1. Open `index.html` in a browser.
2. If local file loading blocks the images, run a small local server and open the project from `http://localhost`.

Example:

```sh
python3 -m http.server
```

Then open the printed local URL in your browser.

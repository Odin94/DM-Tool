# Cozy Quest Hub

Create a dashboard page for a DMing tool for TTRPGs

The tool should be able to switch between scenes, play music (one at a time) and sound effects (one per invocation, but multiple can overlap; should be either one-shot or loop until turned off) and should be able to change connected lighting to pre-defined scenes. It should also show prewritten notes (general and scene-specific), and allow adding notes (all in one big notes file)

Each scene should also come with it's own background image (or maybe even video?)

It should also be possible to quickly access and even pin-to-screen character sheets(-summaries) of player characters or NPCs (scene specific and general)

UI-design ideas that I have in mind:
* It seems that each asset (music, NPCs, notes etc.) can be split into scene-specific and general. Maybe this type of split should be core to the design
* DMs will always want to decide what to do first (change music, play sound, access NPC or player sheet etc.) and then the detail (for this scene specifically, this NPC specifically) . I'm thinking that the "what to do" should be the first easily accessible thing, and then the detailed specific thing should be sorted by likelihood that you want to access it (maybe you can give things priorities or pin them in a specific slot?)

For now we only care about the design of this dashboard. It's important that it is clean, provides a clear overview of capabilities and makes it fast and easy for the DM to use the features in the heat of play. Sound effects, writing notes and reading scene specific notes are most important to be able to access easily and quickly. Scene changes, lighting changes and bgm changes are rarer and can be behind menus or dialogs.

The aesthetic should be cozy, friendly, warm, playful, pastel-colors
It should also look good on 13" laptops and mobile

In terms of tech, I'd like to use react + tailwind + shadcn

Only give me the UI, and only for this one core page. We will take care of anything else later

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d07d1a43-d41f-4e03-8f4f-1fddba1b14b7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

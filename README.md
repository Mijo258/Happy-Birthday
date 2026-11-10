# Birthday surprise

A Next.js App Router website using TypeScript, Tailwind CSS 4, Framer Motion,
and the Amiri Arabic font through `next/font/google`.

Requires Node.js 20.9 or newer. Internet access is needed when installing
dependencies and when Next.js downloads the Google font during the build.

## Files

- `src/components/PasswordGate.tsx`: the animated gate; the PIN is `2611`.
- `src/app/page.tsx`: connects `onSuccess()` to a birthday welcome screen.
  Replace the welcome screen with the rest of your birthday content.
- `src/app/layout.tsx`: Arabic document settings, metadata, and font loading.
- `src/app/globals.css`: Tailwind and global styles.

## Install and verify

Run these commands from this directory, one at a time:

```powershell
npm install
npm run typecheck
npm run build
npm run start
```

Visit <http://localhost:3000> to check the production build. For development,
stop the production server with Ctrl+C and run `npm run dev`.

## Interaction checks

- Enter an incorrect four-digit PIN: the keypad shakes, clears, and displays
  an error. Try again to check that the error animation repeats.
- Enter `2611`: the gate fades into white, then reveals the birthday screen.
- Clear removes all digits. Input is capped at four digits.
- Keyboard digits work while focus is within the keypad. Backspace deletes
  the last digit; Escape and Delete clear all digits.
- Enter submits when the form itself is focused. Focused buttons retain their
  normal Enter and Space behavior; Tab moves between the form and its buttons.
- With reduced motion enabled, flowers stay still and the keypad does not
  float or shake. Error text and the success fade remain available.

The initial files were written without running an install, type check, or build.

# Third-Party Skill Attribution

## obsidian-skills (kepano)

The following skills are vendored from [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills):

- `personal/skills/obsidian-cli/`
- `personal/skills/obsidian-markdown/`
- `personal/skills/obsidian-bases/`
- `personal/skills/json-canvas/`
- `general/skills/defuddle/` (categorized as general since it has no Obsidian dependency)

**Upstream commit:** `fa1e131a014576ff8f8919f191a7ca8d8fded39b` (2026-04-02)
**License:** MIT — Copyright (c) 2026 Steph Ango (@kepano)

### MIT License

```
MIT License

Copyright (c) 2026 Steph Ango (@kepano)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OF OTHER DEALINGS IN THE
SOFTWARE.
```

### Updating

These skills are vendored (plain copy), not a submodule/subtree. To refresh:

```bash
git clone --depth 1 https://github.com/kepano/obsidian-skills /tmp/obsidian-skills
cp -r /tmp/obsidian-skills/skills/defuddle ~/.my-pi/general/skills/
for d in obsidian-cli obsidian-markdown obsidian-bases json-canvas; do
  cp -r /tmp/obsidian-skills/skills/$d ~/.my-pi/personal/skills/
done
# Then bump the upstream commit SHA above.
```

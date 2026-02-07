filepath = 'client/src/components/RecipeForm.tsx'
with open(filepath, 'r') as f:
    content = f.read()

search_str = "className={`btn btn-sm ${slotKeys.includes(slot) ? 'btn-primary' : 'btn-ghost'}`}"
replace_str = "className={`btn btn-sm ${slotKeys.includes(slot) ? 'btn-primary' : 'btn-ghost'}`}\n                aria-pressed={slotKeys.includes(slot)}"

if search_str in content:
    new_content = content.replace(search_str, replace_str)
    with open(filepath, 'w') as f:
        f.write(new_content)
    print("Updated successfully")
else:
    print("String not found")

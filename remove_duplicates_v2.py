import re

with open('config/dataPoints.ts', 'r') as f:
    content = f.read()

# Find the start and end of the dataPoints array
start_index = content.find('export const dataPoints: ExtendedDataPoint[] = [')
if start_index == -1:
    raise ValueError("Could not find the start of the dataPoints array")

array_start = content.find('[', start_index)
array_end = content.rfind('];')
if array_end == -1:
    raise ValueError("Could not find the end of the dataPoints array")

# Extract the array content as a string
array_content = content[array_start+1:array_end]

# A simple regex to find objects. It assumes that there are no nested braces.
# This is not perfect, but it should work for this file.
object_literals = re.findall(r'\{[^{}]*\}', array_content)

unique_objects = {}
for obj_str in object_literals:
    # Extract the id from the object string
    match = re.search(r"id:\s*'([^']*)'", obj_str)
    if match:
        obj_id = match.group(1)
        if obj_id not in unique_objects:
            unique_objects[obj_id] = obj_str.strip()

# Reconstruct the array with unique objects
unique_objects_list = list(unique_objects.values())

unique_objects_str = ",\n".join(unique_objects_list)

# Reconstruct the file content
new_content = content[:array_start+1] + '\n' + unique_objects_str + '\n' + content[array_end:]

with open('config/dataPoints.ts', 'w') as f:
    f.write(new_content)

print("Duplicates removed successfully.")

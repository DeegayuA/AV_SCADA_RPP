import re

with open('config/dataPoints.ts', 'r') as f:
    content = f.read()

# This regex is designed to find all the object literals in the array.
# It's not perfect but should work for this specific file format.
# It looks for '{' and finds the matching '}'
object_literals = re.findall(r'\{\s*id:.*?\s*\},?', content, re.DOTALL)

unique_objects = {}
for obj_str in object_literals:
    # Extract the id from the object string
    match = re.search(r"id:\s*'([^']*)'", obj_str)
    if match:
        obj_id = match.group(1)
        if obj_id not in unique_objects:
            unique_objects[obj_id] = obj_str

# Reconstruct the array with unique objects
# I need to be careful about the comma at the end of each object
# The regex captures it, so I need to make sure the last object doesn't have a comma
unique_objects_list = list(unique_objects.values())
# remove comma from last object
if unique_objects_list:
    unique_objects_list[-1] = unique_objects_list[-1].rstrip().rstrip(',')

unique_objects_str = "\n".join(unique_objects_list)


# Find the start and end of the dataPoints array
start_index = content.find('export const dataPoints: ExtendedDataPoint[] = [')
if start_index == -1:
    raise ValueError("Could not find the start of the dataPoints array")

start_index = content.find('[', start_index)
end_index = content.rfind('];')
if end_index == -1:
    raise ValueError("Could not find the end of the dataPoints array")

# Reconstruct the file content
new_content = content[:start_index+1] + '\n' + unique_objects_str + '\n' + content[end_index:]

with open('config/dataPoints.ts', 'w') as f:
    f.write(new_content)

print("Duplicates removed successfully.")

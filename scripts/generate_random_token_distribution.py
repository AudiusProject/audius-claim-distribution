import json
import csv
import random
import sys

output = []

with open(sys.argv[1]) as fle:
    f = csv.DictReader(fle)
    for line in f:
        tokens = str(random.randint(10000, 50000) * pow(10, 18))
        obj = {}
        obj['address'] = line['wallet']
        obj['earnings'] = tokens
        obj['reasons'] = ''

        output.append(obj)

dump = json.dumps(output)

with open(sys.argv[2] + '.json', 'w') as fle:
    fle.write(dump)

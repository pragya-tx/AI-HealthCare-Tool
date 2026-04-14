import csv
import json

def update_vocab():
    with open(r"disease_symptom_matrix.csv", "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        headers = next(reader)
        
    # Skip 'disease' column
    symptoms = headers[1:]
    
    # Replace underscores with spaces for normalization purposes
    clean_symptoms = [s.replace("_", " ") for s in symptoms]
    
    with open(r"symptoms_vocab.json", "w", encoding="utf-8") as f:
        json.dump(clean_symptoms, f, indent=2)
        
    print(f"Successfully extracted {len(clean_symptoms)} symptoms and saved to symptoms_vocab.json")

if __name__ == '__main__':
    update_vocab()

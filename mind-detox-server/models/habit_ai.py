import json

def analyze_addictions_from_health(health_scores):
    """Simple addiction detection based only on organ health percentages"""
    addictions = {}
    
    # Define organ-to-addiction relationships
    organ_mapping = {
        'alcohol': {
            'organs': {'Liver': 0.9, 'Brain': 0.5, 'Heart': 0.6},
            'threshold': 90  # Show addiction if any organ below 90%
        },
        'smoking': {
            'organs': {'Lungs': 0.9, 'Heart': 0.6, 'Brain': 0.4},
            'threshold': 90
        },
        'social_media': {
            'organs': {'Brain': 0.9, 'Heart': 0.3},
            'threshold': 90
        },
        'gaming': {
            'organs': {'Brain': 0.8, 'Heart': 0.2},
            'threshold': 90
        },
        'fast_food': {
            'organs': {'Stomach': 0.8, 'Liver': 0.6, 'Heart': 0.4},
            'threshold': 90
        }
    }
    
    for addiction, config in organ_mapping.items():
        severity_score = 0
        organ_count = 0
        
        for organ, weight in config['organs'].items():
            if organ in health_scores:
                health = health_scores[organ]
                if health < config['threshold']:
                    # Calculate severity: lower health = higher severity
                    deficit = 100 - health
                    severity_score += deficit * weight
                    organ_count += 1
        
        if organ_count > 0:
            avg_severity = severity_score / organ_count
            if avg_severity >= 10:  # Lower threshold to show more addictions
                addictions[addiction] = {
                    'severity_score': avg_severity,
                    'level': get_severity_level(avg_severity)
                }
    
    return addictions

def get_severity_level(score):
    """Convert severity score to level"""
    if score >= 60:
        return "HIGH"
    elif score >= 40:
        return "MODERATE"
    elif score >= 20:
        return "LOW"
    else:
        return "MINIMAL"

def main():
    """Main function to process input and return addiction analysis"""
    import sys
    
    # Read input data
    if not sys.stdin.isatty():
        raw_input = sys.stdin.read()
        input_data = json.loads(raw_input) if raw_input else {}
    else:
        # Test data
        input_data = {
            "health_scores": {"Brain": 65, "Heart": 70, "Lungs": 80, "Stomach": 75, "Liver": 25}
        }
    
    health_scores = input_data.get('health_scores', {})
    
    # Analyze addictions
    addictions = analyze_addictions_from_health(health_scores)
    
    # Return result
    result = {
        'ok': True,
        'addictions': addictions
    }
    
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()

class BiasFilter:
    MASKED_FIELDS = [
        "full_name", 
        "email", 
        "phone", 
        "linkedin_url", 
        "github_username", 
        "education.institution"
    ]
    
    @classmethod
    def anonymize(cls, candidate_dict: dict) -> dict:
        anon = candidate_dict.copy()
        
        # We assume flattening or pre-processing if dealing with nested json paths
        for field in cls.MASKED_FIELDS:
            if "." in field:
                parent, child = field.split(".")
                if parent in anon and isinstance(anon[parent], list):
                    for item in anon[parent]:
                        if child in item:
                            item[child] = "[REDACTED]"
            else:
                if field in anon:
                    anon[field] = anon.get("anonymized_id", "[REDACTED]")
                    
        return anon

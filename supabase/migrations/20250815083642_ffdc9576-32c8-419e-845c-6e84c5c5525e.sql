-- Reset financials data that's causing the clock icon
UPDATE institution_financials 
SET audit_opinion = NULL
WHERE institution_id = 'b2fa225e-ee22-4d58-baf4-9f6249dc6555';

-- Reset section completion to 0% for consistency
UPDATE institution_section_completion 
SET completion_percentage = 0, is_completed = false
WHERE institution_id = 'b2fa225e-ee22-4d58-baf4-9f6249dc6555' 
AND section_name IN ('financials');
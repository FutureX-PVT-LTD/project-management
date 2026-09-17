-- The legacy catalog required globally unique names. Functional roles are normalized by code,
-- while display names are unique within a category.
DROP INDEX IF EXISTS "JobRole_name_key";

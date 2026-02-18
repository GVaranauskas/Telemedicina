---
name: neo4j-cypher-best-practices
description: Write correct and performant Neo4j Cypher queries. Use when writing Cypher queries, debugging Neo4j errors, or reviewing graph database code. Covers common pitfalls like OR true, Cartesian products, and null handling.
---

# Neo4j Cypher Best Practices

Avoid common bugs when writing Cypher queries for graph databases.

## Critical Anti-Patterns

### 1. Never Use `OR true` as Fallback

```cypher
-- WRONG: Returns ALL results, ignores filter
WHERE j.city = myCity.name OR true

-- CORRECT: Filter actually works
WHERE j.city = myCity.name OR j.specialty IN mySpecialties
```

`OR true` makes the entire WHERE clause useless - it always evaluates to true.

### 2. Avoid Cartesian Products

```cypher
-- WRONG: Two separate MATCH creates Cartesian product
MATCH (d:Doctor)-[:HAS_SKILL]->(s:Skill)
WHERE s.name =~ $pattern
MATCH (d)-[:LOCATED_IN]->(c:City)
WHERE c.name =~ $cityPattern

-- CORRECT: Single WHERE with AND
MATCH (d:Doctor)-[:HAS_SKILL]->(s:Skill)
MATCH (d)-[:LOCATED_IN]->(c:City)
WHERE s.name =~ $pattern
  AND c.name =~ $cityPattern
```

Multiple MATCH clauses without relationships between them create Cartesian products.

### 3. Null-Safe Property Access

```cypher
-- WRONG: Fails if myCity is null
WHERE j.city = myCity.name

-- CORRECT: Handle null case
WHERE (myCity IS NOT NULL AND j.city = myCity.name)
   OR j.specialty IN mySpecialties
```

### 4. Use OPTIONAL MATCH for May-Not-Exist Patterns

```cypher
-- WRONG: Fails if no connection exists
MATCH (a)-[r:CONNECTED_TO]-(b)

-- CORRECT: Returns null if no connection
OPTIONAL MATCH (a)-[r:CONNECTED_TO]-(b)
```

## Performance Tips

### Use Parameters

```cypher
-- WRONG: String interpolation (injection risk, no query plan caching)
WHERE s.name =~ '(?i).*' + $userInput + '.*'

-- CORRECT: Use parameters
WHERE s.name =~ $pattern
-- Pass pattern as parameter: `(?i).*${escapeRegex(userInput)}.*`
```

### Limit Early for Large Datasets

```cypher
-- WRONG: Processes all then limits
WITH d, count(r) AS cnt
ORDER BY cnt DESC
LIMIT 10
RETURN d

-- CORRECT: Limit before expensive operations
MATCH (d:Doctor)
WITH d LIMIT 100
OPTIONAL MATCH (d)-[r]-()
WITH d, count(r) AS cnt
ORDER BY cnt DESC
LIMIT 10
RETURN d
```

## Security

### Regex Escape User Input

Always escape special regex characters in user input:

```typescript
const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pattern = `(?i).*${escapeRegex(userInput)}.*`;
```

### Block Dangerous Keywords in Dynamic Queries

```typescript
const dangerousPatterns = [
  /\bDELETE\b/i,
  /\bCREATE\b/i,
  /\bSET\b/i,
  /\bREMOVE\b/i,
  /\bDROP\b/i,
  /\bMERGE\b/i,
  /\bDETACH\b/i,
  /\bCALL\b/i,
  /\bFOREACH\b/i,
];
```

## Checklist

Before submitting Cypher code:
- [ ] No `OR true` anywhere in WHERE clauses
- [ ] All MATCH clauses are connected by relationships
- [ ] Null properties handled with `IS NOT NULL` checks
- [ ] User input escaped for regex patterns
- [ ] LIMIT applied for potentially large result sets

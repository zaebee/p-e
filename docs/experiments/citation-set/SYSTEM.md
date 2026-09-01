# The system

A shared log. Participants write records into it. The log is append-only: a record, once
written, is never modified, and a correction is written as a new record.

## Records

Every record receives an identifier when it is written. Identifiers are unique and are never
reused.

A record's content is a sequence of bytes. The SHA-256 of those bytes is well defined for any
record that someone holds.

## References to earlier records

A record may refer to one earlier record. Call that earlier record the *predecessor*.

The reference is carried in two fields of the record:

- one field names the predecessor's **identifier**;
- one field carries a **SHA-256 digest** of the predecessor's bytes.

Either field may be absent. A record that refers to nothing has both absent. Authors are not
prevented by the writing tool from leaving either one absent, and records written by different
tools and at different times are present in the log.

## Readers

The log is distributed. Any given reader holds some subset of the records that exist, and which
subset it holds depends on how records reached it. A reader may hold a record whose predecessor
it does not hold. A reader cannot enumerate the records it does not hold.

A reader has no channel to the author of a record and cannot ask what was meant.

## The report

A reader is asked to walk every record it holds and produce, for each one, a report about that
record's reference to its predecessor.

The report is read later by people deciding where to look when something appears wrong, and by
programs that count how many records are in each condition.

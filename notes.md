# Consistent Hashing: Citation and Reference Mapping Guide

## How to Use This Document

This guide maps each reference to the specific sections where it should be cited in your report. Use this to ensure proper academic attribution and to quickly find sources when writing specific sections.

---

## Primary Academic Sources (MUST CITE)

### 1. Karger et al. (1997) - The Original Paper

**Full Citation (IEEE Format):**
```
D. Karger, E. Lehman, T. Leighton, R. Panigrahy, M. Levine, and D. Lewin, 
"Consistent hashing and random trees: Distributed caching protocols for 
relieving hot spots on the World Wide Web," in Proc. 29th Annu. ACM Symp. 
Theory of Computing (STOC), El Paso, TX, USA, May 1997, pp. 654–663, 
doi: 10.1145/258533.258660.
```

**Where to Cite:**
- ✅ Introduction: "Consistent hashing was introduced by Karger et al. in 1997 [1]"
- ✅ Historical context: "Originally developed for Akamai's CDN [1]"
- ✅ Theoretical foundations: "The ring abstraction and clockwise rule [1]"
- ✅ Load balance theorem: "Karger et al. proved that maximum load is O((K/N) log N) [1]"
- ✅ Virtual nodes analysis: "The variance reduction with virtual nodes [1]"

**Key Quotes (paraphrase these):**
- "The basic idea is to hash both objects and caches onto a common range"
- "When a cache is removed, only objects in that cache need to be moved"

---

### 2. Stoica et al. (2001) - Chord DHT

**Full Citation (IEEE Format):**
```
I. Stoica, R. Morris, D. Karger, M. F. Kaashoek, and H. Balakrishnan, 
"Chord: A scalable peer-to-peer lookup service for internet applications," 
in Proc. ACM SIGCOMM, San Diego, CA, USA, Aug. 2001, pp. 149–160, 
doi: 10.1145/964723.383071.
```

**Where to Cite:**
- ✅ Introduction: "Applied to peer-to-peer systems [2]"
- ✅ Distributed hash tables: "Chord implements consistent hashing for scalable key lookup [2]"
- ✅ Lookup complexity: "Achieves O(log N) lookup with finger tables [2]"

**Key Concepts to Attribute:**
- Finger table optimization for faster lookups
- Stabilization protocol for dynamic membership

---

### 3. DeCandia et al. (2007) - Amazon Dynamo

**Full Citation (IEEE Format):**
```
G. DeCandia et al., "Dynamo: Amazon's highly available key-value store," 
in Proc. ACM SIGOPS Operating Systems Review, vol. 41, no. 6, Oct. 2007, 
pp. 205–220, doi: 10.1145/1323293.1294281.
```

**Where to Cite:**
- ✅ Real-world applications: "Amazon Dynamo uses consistent hashing for partitioning [3]"
- ✅ Weighted virtual nodes: "Dynamo assigns virtual nodes proportional to node capacity [3]"
- ✅ Replication: "Each key is stored on N successive nodes (preference list) [3]"
- ✅ Performance: "Achieves <0.5% data movement per node change [3]"

**Key Implementation Details:**
- Q virtual nodes per physical node
- Preference list for replication
- Vector clocks for conflict resolution

---

### 4. Eisenbud et al. (2016) - Google Maglev

**Full Citation (IEEE Format):**
```
D. E. Eisenbud et al., "Maglev: A fast and reliable software network load 
balancer," in Proc. USENIX NSDI, Santa Clara, CA, USA, Mar. 2016, 
pp. 523–535. [Online]. Available: 
https://www.usenix.org/system/files/conference/nsdi16/nsdi16-paper-eisenbud.pdf
```

**Where to Cite:**
- ✅ Load balancing applications: "Google's Maglev achieves O(1) lookups using a pre-computed table [4]"
- ✅ Variants section: "Maglev hashing uses permutation-based table filling [4]"
- ✅ Performance comparison: "Handles 10M+ packets/second with <1% disruption [4]"
- ✅ L4 load balancing: "Provides connection affinity for TCP flows [4]"

**Performance Numbers (with citation):**
- Lookup time: ~20ns [4]
- Throughput: 10M packets/sec [4]
- Disruption: <1% connections move [4]

---

### 5. Lamping & Veach (2014) - Jump Consistent Hash

**Full Citation (IEEE Format):**
```
J. Lamping and E. Veach, "A fast, minimal memory, consistent hash algorithm," 
arXiv preprint arXiv:1406.2294, Jun. 2014. [Online]. Available: 
https://arxiv.org/abs/1406.2294
```

**Where to Cite:**
- ✅ Variants section: "Jump Hash achieves perfect balance with O(1) memory [5]"
- ✅ Algorithm comparison: "O(ln N) computation replaces ring structure [5]"
- ✅ Limitations: "Requires sequential bucket numbering [5]"

**Algorithm Attribution:**
- Pure arithmetic, no data structure [5]
- Perfect balance guarantee [5]
- Cannot remove arbitrary buckets [5]

---

### 6. Thaler & Ravishankar (1998) - Rendezvous Hashing

**Full Citation (IEEE Format):**
```
D. G. Thaler and C. V. Ravishankar, "Using name-based mappings to increase 
hit rates," IEEE/ACM Trans. Netw., vol. 6, no. 1, pp. 1–14, Feb. 1998, 
doi: 10.1109/90.554723.
```

**Where to Cite:**
- ✅ Variants section: "Rendezvous hashing (HRW) achieves perfect balance [6]"
- ✅ Algorithm comparison: "Requires O(N) computation per lookup [6]"
- ✅ Trade-offs: "Suitable for small clusters where balance is critical [6]"

---

## Implementation and Systems Papers

### 7. Lakshman & Malik (2010) - Apache Cassandra

**Full Citation (IEEE Format):**
```
A. Lakshman and P. Malik, "Cassandra: A decentralized structured storage 
system," ACM SIGOPS Operating Systems Review, vol. 44, no. 2, pp. 35–40, 
Apr. 2010, doi: 10.1145/1773912.1773922.
```

**Where to Cite:**
- ✅ Real-world systems: "Cassandra uses token-based partitioning [7]"
- ✅ Virtual nodes: "Default of 256 vnodes per physical node [7]"
- ✅ Multi-datacenter: "Topology-aware replication [7]"

---

### 8. Facebook Katran

**Full Citation (Web Source):**
```
"Open-sourcing Katran, a scalable network load balancer," Facebook Engineering,
May 22, 2018. [Online]. Available: 
https://engineering.fb.com/2018/05/22/open-source/open-sourcing-katran-a-scalable-network-load-balancer/
```

**Where to Cite:**
- ✅ L4 load balancing: "Facebook's Katran uses eBPF and consistent hashing [8]"
- ✅ Performance: "Handles 40M+ packets/second per core [8]"
- ✅ Architecture: "IPIP encapsulation with Direct Server Return [8]"

---

### 9. Discord Case Study

**Full Citation (Web Source):**
```
"How Discord stores billions of messages," Discord Engineering, 
accessed Apr. 2026. [Online]. Available: 
https://discord.com/blog/how-discord-stores-billions-of-messages
```

**Where to Cite:**
- ✅ Migration story: "Discord reduced scaling time from hours to minutes [9]"
- ✅ Real-world impact: "Eliminated downtime during database scaling [9]"

---

## Theoretical Background

### 10. Azar et al. (1999) - Balls and Bins

**Full Citation (IEEE Format):**
```
Y. Azar, A. Z. Broder, A. R. Karlin, and E. Upfal, "Balanced allocations," 
SIAM J. Comput., vol. 29, no. 1, pp. 180–200, 1999, 
doi: 10.1137/S0097539795288490.
```

**Where to Cite:**
- ✅ Mathematical analysis: "Load distribution follows balls-and-bins model [10]"
- ✅ Variance bounds: "With k choices, max load is (1+ε)·K/N where ε = O(√(log N/k)) [10]"

---

### 11. Raab & Steger (1998) - Tight Analysis

**Full Citation (Conference):**
```
M. Raab and A. Steger, "Balls into bins — A simple and tight analysis," 
in Proc. Int. Workshop Randomization and Approximation Techniques in Computer 
Science, Oct. 1998, pp. 159–170.
```

**Where to Cite:**
- ✅ Theoretical bounds: "Chernoff bounds for hash-based distribution [11]"

---

## Tutorial and Educational Resources

### 12. Tom White's Blog Post

**Full Citation (Web Source):**
```
T. White, "Consistent hashing," Nov. 2007. [Online]. Available: 
https://tom-e-white.com/2007/11/consistent-hashing.html
```

**Where to Cite:**
- ✅ Background reading (acknowledge in introduction)
- ✅ Visualization concepts
- Note: This is a blog, use for understanding but cite primary sources for facts

---

### 13. Stanford Lecture Notes

**Full Citation (Lecture Notes):**
```
T. Roughgarden, "CS168: The modern algorithmic toolbox, Lecture 1," 
Stanford University, 2016. [Online]. Available: 
https://theory.stanford.edu/~tim/s16/l/l1.pdf
```

**Where to Cite:**
- ✅ Educational context
- ✅ Algorithm explanations (verify against primary sources)

---

### 14. Kleppmann Book

**Full Citation (Book):**
```
M. Kleppmann, Designing Data-Intensive Applications. Sebastopol, CA, USA: 
O'Reilly Media, 2017, ch. 6.
```

**Where to Cite:**
- ✅ Partitioning strategies overview
- ✅ Real-world trade-offs discussion

---

## Citation Placement Map for 3-Page Report

### Page 1: Introduction & Problem Context

**Section 1.1: The Scaling Challenge**
- Generic problem description: No citation needed (common knowledge)
- Mod-N approach flaw: No citation (basic algorithm)
- Real-world example: [9] Discord case study

**Section 1.2: Historical Context**
- Original paper: [1] Karger et al.
- Akamai use case: [1] Karger et al.
- Modern applications: [3] Dynamo, [7] Cassandra

**Section 1.3: Relation to Load Balancing**
- L4/L7 context: [4] Maglev
- Session affinity: [4] Maglev
- Connection to Katran: [8] Facebook Katran

---

### Page 2: Algorithm Description & Technical Analysis

**Section 2.1: Core Algorithm**
- Ring abstraction: [1] Karger et al.
- Assignment rule: [1] Karger et al.
- Complexity analysis: [1] Karger et al., [2] Chord

**Section 2.2: Virtual Nodes**
- Load variance problem: [1] Karger et al.
- Virtual nodes solution: [1] Karger et al.
- Mathematical bounds: [10] Azar et al.

**Section 2.3: Data Structures**
- Sorted array vs. tree: General CS (no citation)
- Binary search complexity: Textbook knowledge (no citation)

**Section 2.4: Theoretical Properties**
- Balance guarantee: [1] Karger et al., [10] Azar et al.
- Monotonicity proof: [1] Karger et al.
- Disruption bounds: [1] Karger et al.

---

### Page 3: Comparative Analysis & Critical Evaluation

**Section 3.1: Variants**
- Jump Hash: [5] Lamping & Veach
- Maglev: [4] Eisenbud et al.
- Rendezvous: [6] Thaler & Ravishankar

**Section 3.2: Practical Trade-offs**
- Memory overhead: [3] Dynamo, [4] Maglev
- Rebalancing cost: [3] Dynamo
- Heterogeneous nodes: [3] Dynamo

**Section 3.3: Real-World Performance**
- Dynamo benchmarks: [3] DeCandia et al.
- Discord case study: [9] Discord Engineering
- Maglev performance: [4] Eisenbud et al.

**Section 3.4: Limitations**
- Small clusters: General reasoning (no citation)
- Stateless workloads: General reasoning (no citation)
- Range queries: [14] Kleppmann

**Section 3.5: Conclusion**
- Historical impact: [1] Karger et al.
- Modern relevance: [3][4][7][8] Multiple sources
- Future directions: Your own analysis

---

## Citation Style Examples

### IEEE In-Text Citation Format

**Single source:**
```
Consistent hashing was introduced in 1997 [1].
```

**Multiple sources (same point):**
```
This approach is used in many distributed databases [3], [7], [8].
```

**Author-year in text:**
```
Karger et al. [1] proved that the maximum load is O((K/N) log N).
```

**Paraphrasing with citation:**
```
The algorithm maps both keys and nodes to a circular hash space, 
enabling minimal data movement during scaling [1].
```

**Direct quote (use sparingly):**
```
As Eisenbud et al. note, Maglev "achieves high throughput by 
pre-computing the assignment table" [4, p. 525].
```

---

## Common Citation Mistakes to Avoid

### ❌ WRONG: Over-citation
```
Consistent hashing [1] uses a ring [1] where nodes [1] are placed [1]...
```

### ✅ CORRECT: Cite once per idea
```
Consistent hashing uses a ring structure where both nodes and keys 
are mapped to the same hash space [1].
```

---

### ❌ WRONG: No citation for non-obvious facts
```
Maglev achieves 10 million packets per second.
```

### ✅ CORRECT: Cite performance claims
```
Maglev achieves 10 million packets per second [4].
```

---

### ❌ WRONG: Citing secondary sources for primary ideas
```
According to the Stanford lecture notes, Karger invented consistent hashing [13].
```

### ✅ CORRECT: Cite primary source
```
Consistent hashing was introduced by Karger et al. in 1997 [1], 
as explained in [13].
```

---

### ❌ WRONG: Missing source for algorithm
```
Jump Hash uses this formula: [shows formula]
```

### ✅ CORRECT: Attribute algorithm
```
The Jump Hash algorithm [5] computes the bucket as follows: [shows formula]
```

---

## Quick Reference: Which Citation for What

| Content Type | Primary Citation | Secondary Citation |
|--------------|-----------------|-------------------|
| **Original algorithm** | [1] Karger et al. | — |
| **Virtual nodes theory** | [1] Karger et al. | [10] Azar (variance) |
| **DHT application** | [2] Chord | — |
| **Industry use (Amazon)** | [3] Dynamo | — |
| **Industry use (Google)** | [4] Maglev | — |
| **Jump Hash variant** | [5] Lamping & Veach | — |
| **Rendezvous variant** | [6] Thaler | — |
| **Cassandra details** | [7] Lakshman & Malik | — |
| **Load balancing (L4)** | [4] Maglev, [8] Katran | — |
| **Case study** | [9] Discord | — |
| **Theoretical bounds** | [10] Azar et al. | — |
| **General partitioning** | [14] Kleppmann | — |

---

## Building Your Reference List

### IEEE Format Template

```
[1] A. Author, B. Author, and C. Author, "Title of paper," 
    in Proc. Conference Name, City, Country, Month Year, 
    pp. xxx–yyy, doi: xx.xxxx/xxxxx.

[2] A. Author, "Title of journal article," Journal Name, 
    vol. x, no. y, pp. xxx–yyy, Month Year, 
    doi: xx.xxxx/xxxxx.

[3] A. Author, Book Title. City, State, Country: Publisher, Year.

[4] "Title of web page," Website Name, accessed Month Year. 
    [Online]. Available: http://example.com
```

### Order Your References

1. Number references in the order they first appear in your report
2. Use the same number consistently throughout
3. Format all references identically
4. Include DOI when available
5. For web sources, include access date

---

## Pre-Written Reference List (Ready to Use)

```
REFERENCES

[1] D. Karger, E. Lehman, T. Leighton, R. Panigrahy, M. Levine, 
    and D. Lewin, "Consistent hashing and random trees: Distributed 
    caching protocols for relieving hot spots on the World Wide Web," 
    in Proc. 29th Annu. ACM Symp. Theory of Computing (STOC), 
    El Paso, TX, USA, May 1997, pp. 654–663, 
    doi: 10.1145/258533.258660.

[2] I. Stoica, R. Morris, D. Karger, M. F. Kaashoek, and 
    H. Balakrishnan, "Chord: A scalable peer-to-peer lookup service 
    for internet applications," in Proc. ACM SIGCOMM, San Diego, CA, 
    USA, Aug. 2001, pp. 149–160, doi: 10.1145/964723.383071.

[3] G. DeCandia et al., "Dynamo: Amazon's highly available key-value 
    store," ACM SIGOPS Operating Systems Review, vol. 41, no. 6, 
    pp. 205–220, Oct. 2007, doi: 10.1145/1323293.1294281.

[4] D. E. Eisenbud et al., "Maglev: A fast and reliable software 
    network load balancer," in Proc. USENIX NSDI, Santa Clara, CA, 
    USA, Mar. 2016, pp. 523–535. [Online]. Available: 
    https://www.usenix.org/system/files/conference/nsdi16/nsdi16-paper-eisenbud.pdf

[5] J. Lamping and E. Veach, "A fast, minimal memory, consistent hash 
    algorithm," arXiv preprint arXiv:1406.2294, Jun. 2014. 
    [Online]. Available: https://arxiv.org/abs/1406.2294

[6] D. G. Thaler and C. V. Ravishankar, "Using name-based mappings to 
    increase hit rates," IEEE/ACM Trans. Netw., vol. 6, no. 1, 
    pp. 1–14, Feb. 1998, doi: 10.1109/90.554723.

[7] A. Lakshman and P. Malik, "Cassandra: A decentralized structured 
    storage system," ACM SIGOPS Operating Systems Review, vol. 44, 
    no. 2, pp. 35–40, Apr. 2010, doi: 10.1145/1773912.1773922.

[8] "Open-sourcing Katran, a scalable network load balancer," 
    Facebook Engineering, May 22, 2018. [Online]. Available: 
    https://engineering.fb.com/2018/05/22/open-source/open-sourcing-katran-a-scalable-network-load-balancer/

[9] "How Discord stores billions of messages," Discord Engineering, 
    2017. [Online]. Available: 
    https://discord.com/blog/how-discord-stores-billions-of-messages

[10] Y. Azar, A. Z. Broder, A. R. Karlin, and E. Upfal, "Balanced 
     allocations," SIAM J. Comput., vol. 29, no. 1, pp. 180–200, 
     1999, doi: 10.1137/S0097539795288490.

[11] T. White, "Consistent hashing," Nov. 2007. [Online]. Available: 
     https://tom-e-white.com/2007/11/consistent-hashing.html

[12] T. Roughgarden, "CS168: The modern algorithmic toolbox, 
     Lecture 1," Stanford University, 2016. [Online]. Available: 
     https://theory.stanford.edu/~tim/s16/l/l1.pdf

[13] M. Kleppmann, Designing Data-Intensive Applications. 
     Sebastopol, CA, USA: O'Reilly Media, 2017.
```

---

## Final Checklist for Citations

Before submitting your report:

- [ ] Every claim about consistent hashing history cites [1] Karger
- [ ] Performance numbers cite specific sources ([3], [4], [8], [9])
- [ ] Algorithms cite their inventors ([5] Jump, [6] Rendezvous)
- [ ] Real-world systems cite their papers ([3] Dynamo, [7] Cassandra)
- [ ] Theoretical bounds cite [1] and [10]
- [ ] No orphaned facts (everything either cited or clearly your own analysis)
- [ ] Reference list formatted consistently
- [ ] All URLs tested and working
- [ ] DOIs included where available

---

*This citation guide ensures academic integrity and proper attribution throughout your report.*
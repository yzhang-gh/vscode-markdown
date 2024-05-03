use regex::Regex;
use wasm_bindgen::prelude::*;
//just referencing the crate will include the slugify function in the wasm bundle
// we don't need to manually expose it since the crate does it for us;
#[allow(unused_imports)]
use slug;

#[cfg(feature = "mini-alloc")]
#[global_allocator]
static ALLOC: mini_alloc::MiniAlloc = mini_alloc::MiniAlloc::INIT;

#[wasm_bindgen]
pub fn slugify_anchors(input: &str) -> String {
    let re = Regex::new(r"\[([^\]]+)\]\(https?://[^\)]+\)").unwrap();
    slug::slugify(re.replace_all(input, "$1"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_slugify_anchors() {
        let test_cases = vec![
            (
                "this is some example [text](https://www.url.com) haha [fun](http://another.example)",
                "this-is-some-example-text-haha-fun"
            ),
            (
                "Check out this [link](http://example.com) and this [another one](https://another.com)!",
                "check-out-this-link-and-this-another-one"
            ),
            (
                "No links here!",
                "no-links-here"
            ),
            (
                "[Edge cases](https://edge.com) lead to [interesting](http://test.com?query=example) results. 大時代",
                "edge-cases-lead-to-interesting-results-da-shi-dai"
            ),
            (
                "にでも長所と短所がある", 
                "nidemochang-suo-toduan-suo-gaaru"
            ),
            (
                "命来犯天写最大巡祭視死乃読", 
                "ming-lai-fan-tian-xie-zui-da-xun-ji-shi-si-nai-du"
            ),
            (
                "국무위원은 국무총리의 제청으로 대통령이 임명한다",
                "gugmuwiweoneun-gugmucongriyi-jeceongeuro-daetongryeongi-immyeonghanda"
            ),
        ];

        for case in test_cases {
            assert_eq!(slugify_anchors(case.0), case.1);
        }
    }
}

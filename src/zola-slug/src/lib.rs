#[allow(unused_imports)]
use slug::slugify;

#[cfg(feature = "mini-alloc")]
#[global_allocator]
static ALLOC: mini_alloc::MiniAlloc = mini_alloc::MiniAlloc::INIT;

#[cfg(test)]
mod tests {
    use slug::slugify;

    #[test]
    fn test_slugify() {
        let test_cases = vec![
            ("にでも長所と短所がある", "nidemochang-suo-toduan-suo-gaaru"),
            (
                "命来犯天写最大巡祭視死乃読",
                "ming-lai-fan-tian-xie-zui-da-xun-ji-shi-si-nai-du",
            ),
            (
                "국무위원은 국무총리의 제청으로 대통령이 임명한다",
                "gugmuwiweoneun-gugmucongriyi-jeceongeuro-daetongryeongi-immyeonghanda",
            ),
        ];

        test_cases.into_iter().for_each(|case| {
            assert_eq!(slugify(case.0), case.1);
        });
    }
}
